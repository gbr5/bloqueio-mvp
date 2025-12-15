# Prisma Migration Plan - Robust Multiplayer Architecture

## User Stories

### Core Gameplay

- **As a player**, I want to create a game room so that I can invite friends to play
- **As a player**, I want to join a room via 6-character code so that I can play with friends
- **As a player**, I want to move my pawn one orthogonal step on my turn so that I progress toward my goal
- **As a player**, I want to jump over opponents when blocked so that I maintain mobility
- **As a player**, I want to place barriers to block opponents so that I gain strategic advantage
- **As a player**, I want to reach the opposite border to win so that I complete the game objective
- **As a player**, I want to see whose turn it is so that I know when I can move
- **As a player**, I want moves to sync in real-time so that all players see the current board state

### Authentication & Identity

- **As a user**, I want to sign up with email/password so that I can save my game history
- **As a user**, I want to sign in with GitHub/Google so that I can quickly access the game
- **As a user**, I want my session to persist across page refreshes so that I don't lose my identity
- **As a player**, I want my username to appear in games so that others know who I am
- **As a user**, I want to see my win/loss record so that I can track my progress

### Game Rules (Critical for Implementation)

- **As a player**, my pawn starts at the **first playable cell after the border** (not on the border itself)
  - Player 0 (RED): Row 5, Col 1 (first cell after LEFT border)
  - Player 1 (BLUE): Row 1, Col 5 (first cell after TOP border)
  - Player 2 (GREEN): Row 5, Col 9 (first cell after RIGHT border)
  - Player 3 (YELLOW): Row 9, Col 5 (first cell after BOTTOM border)
- **As a player**, I **cannot** place barriers on border cells (row/col 0 or 10)
- **As a player**, I **cannot** move my pawn onto border cells EXCEPT when reaching my goal
- **As a player**, I win when I reach **any cell on the opposite border** from my starting position
  - RED wins on RIGHT border (col 10)
  - BLUE wins on BOTTOM border (row 10)
  - GREEN wins on LEFT border (col 0)
  - YELLOW wins on TOP border (row 0)

## Problem Analysis

**Current Issues:**

1. ❌ Ghost players appearing (auto-join creating duplicates)
2. ❌ Host can't move (turn validation broken)
3. ❌ JSON blob in `game_state` column - hard to query/validate
4. ❌ No player-room relationship tracking
5. ❌ Race conditions in polling (2 players move simultaneously)
6. ❌ sessionStorage fragile (clears on tab close)
7. ❌ Incorrect starting positions (pawns on border cells instead of first playable cell)

**Root Cause:**

- Storing entire game state as JSON makes it impossible to do atomic operations
- No proper player identity tracking (relying on client-side storage)
- Can't enforce turn order or validate moves server-side
- Game rules not properly validated (border cell restrictions)

## New Architecture with Prisma

### Database Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Room represents a game session
model Room {
  id          String   @id @default(cuid())
  code        String   @unique // 6-character code (R7IAG2)
  status      RoomStatus @default(WAITING)
  hostId      String?  // Player who created the room
  currentTurn Int      @default(0) // Current player ID (0-3)
  winner      Int?     // Winning player ID
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  players     Player[]
  barriers    Barrier[]
  moves       Move[]   // Move history for undo

  @@index([code])
  @@index([status])
}

enum RoomStatus {
  WAITING   // Lobby - players joining
  PLAYING   // Game in progress
  FINISHED  // Game over
}

// Player in a specific room
model Player {
  id          String   @id @default(cuid())
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  playerId    Int      // 0-3 (position in game)
  sessionId   String   @unique // Browser session identifier
  name        String   // "Player 1", "Player 2", etc.
  color       String   // "#ef4444", "#3b82f6", etc.

  // Game position
  row         Int      @default(5)
  col         Int      @default(0)
  wallsLeft   Int      @default(6)
  goalSide    GoalSide

  joinedAt    DateTime @default(now())
  lastActive  DateTime @updatedAt

  @@unique([roomId, playerId]) // Each room has unique player IDs 0-3
  @@unique([roomId, sessionId]) // Each session can only join once per room
  @@index([sessionId])
}

enum GoalSide {
  TOP
  RIGHT
  BOTTOM
  LEFT
}

// Wall/Barrier placement
model Barrier {
  id           String  @id @default(cuid())
  roomId       String
  room         Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)

  row          Int
  col          Int
  orientation  Orientation
  placedBy     Int     // Player ID who placed it

  createdAt    DateTime @default(now())

  @@index([roomId])
}

enum Orientation {
  HORIZONTAL
  VERTICAL
}

// Move history for potential undo feature
model Move {
  id        String   @id @default(cuid())
  roomId    String
  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  playerId  Int
  fromRow   Int
  fromCol   Int
  toRow     Int
  toCol     Int

  createdAt DateTime @default(now())

  @@index([roomId])
}
```

### Key Improvements

1. **Proper Player Identity**

   - Each player gets unique `sessionId` (generated server-side, stored in cookie)
   - No more sessionStorage/localStorage confusion
   - Server knows exactly who is who

2. **Atomic Operations**

   - Move validation happens server-side with transactions
   - Can't have two players move at once
   - Turn enforcement at database level

3. **Queryable Data**

   - Can query "who's turn is it?" without parsing JSON
   - Can fetch just barriers, just players, etc.
   - Better performance

4. **Cascade Deletes**
   - When room deleted, all players/barriers/moves auto-delete
   - Clean data management

## Implementation Plan

### Phase 1: Setup Prisma (2-3 hours)

**Tasks:**

1. Install Prisma dependencies
2. Initialize Prisma with Neon database
3. Create schema.prisma with models above
4. Generate migration
5. Run migration on Neon

**Commands:**

```bash
pnpm add prisma @prisma/client
pnpm add -D prisma

npx prisma init --datasource-provider postgresql
# Copy schema above to prisma/schema.prisma
# Update DATABASE_URL in .env

npx prisma migrate dev --name init
npx prisma generate
```

**Files Created:**

- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Migration files
- `.env` - DATABASE_URL

### Phase 2: Better Auth Integration (3-4 hours)

**Why Better Auth?**

- Framework-agnostic authentication for TypeScript
- Built-in email/password + social OAuth (GitHub, Google)
- Automatic database management and migrations
- Session management with HTTP-only cookies
- Works seamlessly with Prisma and Neon
- No need to implement our own session/cookie system

**Installation:**

```bash
pnpm install better-auth
```

**Step 1: Update Prisma Schema with Better Auth Tables**

Better Auth will auto-generate its required schema when we run migrations. Add this to your `prisma/schema.prisma`:

```prisma
// Better Auth will generate these models automatically
// Run: npx @better-auth/cli generate

// User model (Better Auth core)
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  sessions      Session[]
  accounts      Account[]

  // Custom fields for game stats
  gamesPlayed   Int       @default(0)
  gamesWon      Int       @default(0)

  @@index([email])
}

// Session model (Better Auth core)
model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([token])
}

// Account model (Better Auth core - for OAuth providers)
model Account {
  id                    String    @id @default(cuid())
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountId             String    // Provider's user ID
  providerId            String    // "github", "google", etc.
  accessToken           String?
  refreshToken          String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?   // For email/password auth
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@unique([providerId, accountId])
  @@index([userId])
}

// Verification model (Better Auth core - for email verification)
model Verification {
  id         String   @id @default(cuid())
  identifier String   // Email or phone
  value      String   // Verification code
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([identifier, value])
}

// Now update Player model to link to authenticated users
model Player {
  id          String   @id @default(cuid())
  roomId      String
  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  playerId    Int      // 0-3 (position in game)
  userId      String?  // Link to Better Auth User (null for guest players)
  name        String   // User's name or "Guest Player X"
  color       String   // "#ef4444", "#3b82f6", etc.

  // Game position - UPDATED with correct starting positions
  row         Int      @default(5)
  col         Int      @default(1)  // Default for Player 0
  wallsLeft   Int      @default(6)
  goalSide    GoalSide

  joinedAt    DateTime @default(now())
  lastActive  DateTime @updatedAt

  @@unique([roomId, playerId]) // Each room has unique player IDs 0-3
  @@unique([roomId, userId])   // Each user can only join once per room
  @@index([userId])
}
```

**Step 2: Create Better Auth Instance**

Create `lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // for Neon
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can enable later
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },

  // Custom user fields for game stats
  user: {
    additionalFields: {
      gamesPlayed: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false, // Don't allow user to set this
      },
      gamesWon: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },
});
```

**Step 3: Add Environment Variables**

Update `.env`:

```bash
# Better Auth
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth (get from https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Google OAuth (get from https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Step 4: Mount Auth Handler**

Create `app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

**Step 5: Create Client Instance**

Create `lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

**Step 6: Run Migrations**

```bash
# Better Auth CLI will generate Prisma schema for auth tables
npx @better-auth/cli generate

# Run Prisma migration
npx prisma migrate dev --name add_better_auth

# Generate Prisma Client
npx prisma generate
```

**Benefits:**

- ✅ Proper user authentication out of the box
- ✅ Session management via HTTP-only cookies (secure)
- ✅ Social OAuth (GitHub, Google) with 2 lines of config
- ✅ User stats tracking (gamesPlayed, gamesWon)
- ✅ Link game players to real users
- ✅ Guest play still supported (userId can be null)

### Phase 3: Session Management (2-3 hours)

**Note:** This phase is now greatly simplified thanks to Better Auth handling sessions!

**Problem to Solve:**

- Reliably identify players across page refreshes
- Don't rely on client-side storage

**Solution: HTTP-only Cookies**

```typescript
// lib/session.ts
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    sessionId = randomBytes(32).toString("hex");
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  }

  return sessionId;
}

export async function getPlayerForSession(
  roomCode: string
): Promise<Player | null> {
  const sessionId = await getOrCreateSessionId();

  return await prisma.player.findFirst({
    where: {
      sessionId,
      room: { code: roomCode },
    },
  });
}
```

**Benefits:**

- Server-side generated IDs
- Survives page refreshes
- Can't be tampered with (httpOnly)
- Each tab gets same session automatically

### Phase 4: Rewrite Server Actions (4-5 hours)

**New API Design:**

```typescript
// lib/actions/room-actions.ts

// Create room - returns room code + sets host session
export async function createRoom(): Promise<{
  code: string;
  playerId: number;
}> {
  const sessionId = await getOrCreateSessionId();

  // Generate unique code
  const code = generateRoomCode();

  // Create room + host player in transaction
  const room = await prisma.room.create({
    data: {
      code,
      hostId: sessionId,
      players: {
        create: {
          playerId: 0,
          sessionId,
          name: "Player 1",
          color: "#ef4444",
          row: 5,
          col: 0,
          goalSide: "RIGHT",
        },
      },
    },
  });

  return { code, playerId: 0 };
}

// Join room - auto-assigns next available player slot
export async function joinRoom(
  code: string
): Promise<{ playerId: number } | { error: string }> {
  const sessionId = await getOrCreateSessionId();

  // Check if already in room
  const existing = await prisma.player.findFirst({
    where: { sessionId, room: { code } },
  });

  if (existing) {
    return { playerId: existing.playerId };
  }

  // Find room and check capacity
  const room = await prisma.room.findUnique({
    where: { code },
    include: { players: true },
  });

  if (!room) return { error: "Room not found" };
  if (room.players.length >= 4) return { error: "Room full" };
  if (room.status !== "WAITING") return { error: "Game already started" };

  // Find next available player slot
  const takenIds = new Set(room.players.map((p) => p.playerId));
  const nextId = [0, 1, 2, 3].find((id) => !takenIds.has(id))!;

  const playerConfigs = [
    { name: "Player 1", color: "#ef4444", row: 5, col: 0, goalSide: "RIGHT" },
    { name: "Player 2", color: "#3b82f6", row: 0, col: 5, goalSide: "BOTTOM" },
    { name: "Player 3", color: "#22c55e", row: 5, col: 10, goalSide: "LEFT" },
    { name: "Player 4", color: "#f59e0b", row: 10, col: 5, goalSide: "TOP" },
  ];

  const config = playerConfigs[nextId];

  await prisma.player.create({
    data: {
      roomId: room.id,
      playerId: nextId,
      sessionId,
      ...config,
    },
  });

  return { playerId: nextId };
}

// Make move - server-side validation
export async function makeMove(
  code: string,
  toRow: number,
  toCol: number
): Promise<{ success: true } | { error: string }> {
  const sessionId = await getOrCreateSessionId();

  const player = await getPlayerForSession(code);
  if (!player) return { error: "Not in this room" };

  const room = await prisma.room.findUnique({
    where: { code },
    include: { players: true, barriers: true },
  });

  if (!room) return { error: "Room not found" };
  if (room.status !== "PLAYING") return { error: "Game not started" };
  if (room.currentTurn !== player.playerId) return { error: "Not your turn" };

  // Validate move (check barriers, other players, etc.)
  const isValid = validateMove(
    player,
    toRow,
    toCol,
    room.players,
    room.barriers
  );

  if (!isValid) return { error: "Invalid move" };

  // Check win condition
  const isWin = checkWin(player.goalSide, toRow, toCol);

  // Update in transaction
  await prisma.$transaction([
    // Update player position
    prisma.player.update({
      where: { id: player.id },
      data: { row: toRow, col: toCol },
    }),

    // Update room turn
    prisma.room.update({
      where: { id: room.id },
      data: {
        currentTurn: (room.currentTurn + 1) % room.players.length,
        winner: isWin ? player.playerId : undefined,
        status: isWin ? "FINISHED" : "PLAYING",
      },
    }),

    // Record move in history
    prisma.move.create({
      data: {
        roomId: room.id,
        playerId: player.playerId,
        fromRow: player.row,
        fromCol: player.col,
        toRow,
        toCol,
      },
    }),
  ]);

  return { success: true };
}

// Place barrier
export async function placeBarrier(
  code: string,
  row: number,
  col: number,
  orientation: "HORIZONTAL" | "VERTICAL"
): Promise<{ success: true } | { error: string }> {
  const sessionId = await getOrCreateSessionId();

  const player = await getPlayerForSession(code);
  if (!player) return { error: "Not in this room" };
  if (player.wallsLeft === 0) return { error: "No walls left" };

  const room = await prisma.room.findUnique({
    where: { code },
    include: { players: true, barriers: true },
  });

  if (!room) return { error: "Room not found" };
  if (room.currentTurn !== player.playerId) return { error: "Not your turn" };

  // Validate barrier placement
  const isValid = validateBarrierPlacement(
    row,
    col,
    orientation,
    room.barriers,
    room.players
  );

  if (!isValid) return { error: "Invalid barrier placement" };

  // Place barrier in transaction
  await prisma.$transaction([
    prisma.barrier.create({
      data: {
        roomId: room.id,
        row,
        col,
        orientation,
        placedBy: player.playerId,
      },
    }),

    prisma.player.update({
      where: { id: player.id },
      data: { wallsLeft: player.wallsLeft - 1 },
    }),

    prisma.room.update({
      where: { id: room.id },
      data: {
        currentTurn: (room.currentTurn + 1) % room.players.length,
      },
    }),
  ]);

  return { success: true };
}

// Get room state - for polling
export async function getRoomState(code: string) {
  const sessionId = await getOrCreateSessionId();

  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      players: {
        orderBy: { playerId: "asc" },
      },
      barriers: true,
    },
  });

  if (!room) return { error: "Room not found" };

  const myPlayer = room.players.find((p) => p.sessionId === sessionId);

  return {
    room,
    myPlayerId: myPlayer?.playerId ?? null,
    isMyTurn: myPlayer?.playerId === room.currentTurn,
  };
}
```

### Phase 5: Update Client Components (3-4 hours)

**Changes:**

1. Remove sessionStorage/localStorage completely
2. Call `getRoomState()` to get player identity
3. Use server actions for all moves/barriers
4. Simplified polling (just refresh state)

```typescript
// components/GameBoard.tsx (simplified)

export function GameBoard({ roomCode }: { roomCode: string }) {
  const [state, setState] = useState<RoomState | null>(null);

  // Poll for updates
  useEffect(() => {
    const poll = async () => {
      const result = await getRoomState(roomCode);
      if ("room" in result) {
        setState(result);
      }
    };

    poll(); // Initial load
    const interval = setInterval(poll, 1000); // 1 second polling

    return () => clearInterval(interval);
  }, [roomCode]);

  const handleMove = async (row: number, col: number) => {
    const result = await makeMove(roomCode, row, col);
    if ("error" in result) {
      alert(result.error);
    }
    // State will update on next poll
  };

  const handleBarrier = async (
    row: number,
    col: number,
    orientation: "HORIZONTAL" | "VERTICAL"
  ) => {
    const result = await placeBarrier(roomCode, row, col, orientation);
    if ("error" in result) {
      alert(result.error);
    }
  };

  if (!state) return <div>Loading...</div>;

  return (
    <BloqueioPage
      gameState={{
        players: state.room.players,
        barriers: state.room.barriers.map((b) => ({
          id: b.id,
          row: b.row,
          col: b.col,
          orientation: b.orientation === "HORIZONTAL" ? "H" : "V",
        })),
        currentPlayerId: state.room.currentTurn,
        winner: state.room.winner ?? null,
        blockedEdges: [], // Derive from barriers
      }}
      myPlayerId={state.myPlayerId}
      disabled={!state.isMyTurn || state.room.status !== "PLAYING"}
      onMove={handleMove}
      onBarrier={handleBarrier}
    />
  );
}
```

### Phase 6: Migration Strategy (1-2 hours)

**How to migrate existing rooms:**

```sql
-- Option 1: Drop old table (if no important data)
DROP TABLE game_rooms;

-- Option 2: Keep for reference
ALTER TABLE game_rooms RENAME TO game_rooms_old;

-- Prisma will create new tables via migration
```

**Testing checklist:**

- [ ] Create room as host
- [ ] Join room in incognito tab
- [ ] Both see correct player identities
- [ ] Host can move on their turn
- [ ] Guest can move on their turn
- [ ] Barriers work correctly
- [ ] Turn enforcement works
- [ ] Win detection works
- [ ] Refresh page - still the same player
- [ ] Close tab, reopen - still same player (for 1 week)

## Timeline

- **Phase 1**: 2-3 hours (Prisma setup)
- **Phase 2**: 3-4 hours (Better Auth integration)
- **Phase 3**: 2-3 hours (Session management - simplified by Better Auth)
- **Phase 4**: 4-5 hours (Server actions rewrite)
- **Phase 5**: 3-4 hours (Client updates)
- **Phase 6**: 1-2 hours (Testing/migration)

**Total: 15-21 hours (3-4 days of focused work)**

**Note:** Better Auth adds ~1 hour to setup but saves ~2 hours of custom session/auth code, so net neutral time-wise with massive feature gains (OAuth, user accounts, stats tracking).

## Benefits Over Current Approach

1. ✅ **No ghost players** - Unique constraints prevent duplicates
2. ✅ **Turn enforcement** - Server validates whose turn it is
3. ✅ **Reliable identity** - HTTP-only cookies, server-generated sessions
4. ✅ **Atomic operations** - No race conditions
5. ✅ **Type safety** - Prisma generates types
6. ✅ **Queryable** - Can answer "who's in room X?" easily
7. ✅ **Scalable** - Proper indexes, relations
8. ✅ **Debuggable** - Can inspect DB directly
9. ✅ **User authentication** - Better Auth provides email/password + OAuth out of the box
10. ✅ **Social login** - GitHub and Google login with minimal config
11. ✅ **Player stats** - Track games played/won per user account
12. ✅ **Guest play** - Still supports anonymous play (userId nullable)
13. ✅ **Security** - Password hashing, session tokens, CSRF protection built-in
14. ✅ **User management** - Account creation, verification, password reset ready to go

## Next Steps

1. **Approve this plan** - Make sure architecture makes sense
2. **Backup current code** - Create backup branch
3. **Start Phase 1** - Install Prisma, create schema
4. **Iterate** - Build phase by phase, test each one

Should we proceed with this plan?
