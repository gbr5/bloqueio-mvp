# Bloqueio Online - MVP Implementation Plan

**Version:** 2.0 (Lean Startup Approach)
**Goal:** Launch playable multiplayer game in 2-3 weeks
**Philosophy:** Ship fast, validate market, scale only if traction exists

---

## Table of Contents

1. [MVP Scope Definition](#mvp-scope-definition)
2. [Technical Decisions](#technical-decisions)
3. [Implementation Phases](#implementation-phases)
4. [What We're NOT Building (Yet)](#what-were-not-building-yet)
5. [Success Metrics](#success-metrics)

---

## MVP Scope Definition

### What Users Can Do

✅ **Core Experience:**

- Play the game locally (already works)
- Create a game room and get a shareable link
- Join a game via link/code
- Play real-time multiplayer with 2-4 players
- See opponents' moves instantly
- Basic chat for coordination

✅ **Minimum Viable Features:**

- Simple nickname entry
- Room code sharing (6-digit code)
- "Waiting for players" lobby
- Turn indicator showing whose turn it is
- Game end state with winner announcement
- "Play Again" button

### What We're Deliberately Cutting

❌ **Not in MVP:**

- User accounts/authentication
- Player profiles/stats
- Leaderboards
- Matchmaking
- Reconnection handling (just restart)
- Sophisticated error handling (basic alerts are fine)
- Accessibility beyond basics
- Mobile optimization (desktop-first)
- Internationalization
- Tutorial/onboarding
- Game history/replays

---

## Technical Decisions

### Architecture Choices (Speed-Optimized)

| Aspect               | MVP Choice         | Why                                        | Future Migration                |
| -------------------- | ------------------ | ------------------------------------------ | ------------------------------- |
| **Backend**          | Neon + Vercel      | Native integration, free tier, no server   | Custom Node.js server if needed |
| **State Management** | React Context      | Simple, no deps, good enough               | Zustand if complexity grows     |
| **Real-time Sync**   | Polling (1-2s)     | Simple, no extra deps, good for turn-based | WebSockets if high-frequency    |
| **Hosting**          | Vercel             | Free, instant deploys, zero config         | Keep it                         |
| **Database**         | Neon PostgreSQL    | Serverless, Vercel-native, generous free   | Keep it or migrate              |
| **Styling**          | Keep inline styles | Already works, no migration needed         | Tailwind later if UI grows      |

### Why This Stack?

**Speed to MVP:**

- Neon database → Vercel integration → Working in < 30 minutes
- No backend code to write/maintain
- Polling is simple (20 lines of code)
- Vercel deployment is literally 3 clicks

**Cost:**

- $0/month until ~3GB storage + 100 hours compute
- Free tier covers ~10K MAU easily
- When you outgrow free tier, you have a real business

---

## Implementation Phases

### Phase 1: Neon Database Setup (30 minutes)

**Goal:** Get database working with Vercel

```bash
# 1. Go to Vercel dashboard → Storage → Create Database
# 2. Select Neon Postgres (it's integrated!)
# 3. Copy connection string
# 4. Done! Database is ready
```

**Database Schema:**

```sql
-- game_rooms table
CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  game_state JSONB NOT NULL,
  player_count INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 4,
  status TEXT DEFAULT 'waiting' -- waiting, playing, finished
);

-- Indexes for fast queries
CREATE INDEX idx_room_code ON game_rooms(room_code);
CREATE INDEX idx_updated_at ON game_rooms(updated_at);
```

**Deliverable:** Can create/read/update game_rooms via Neon

---

### Phase 2: Minimal Refactor (4-6 hours)

**Goal:** Extract just enough to enable multiplayer

**Tasks:**

1. Extract game types to `src/types/game.ts`
2. Extract game state to Context (or keep in component, sync to Neon)
3. Create `useGameRoom` hook for database integration
4. Keep all game logic in `page.tsx` (don't over-refactor)

**Files to Create:**

```
src/
├── types/
│   └── game.ts          (Player, Barrier, GameState types)
├── lib/
│   └── db.ts            (Neon client + SQL helpers)
└── hooks/
    └── useGameRoom.ts   (Room CRUD + polling)
```

**Acceptance Criteria:**

- Game still works locally
- Types are extracted
- Neon client configured (use `@vercel/postgres`)

---

### Phase 3: Create/Join Flow (6-8 hours)

**Goal:** Users can create and join rooms

**UI Components:**

```
src/components/
├── HomeScreen.tsx       (Create or Join buttons)
├── CreateRoom.tsx       (Nickname → Generate code → Copy link)
├── JoinRoom.tsx         (Enter code → Enter nickname → Join)
└── WaitingLobby.tsx     (Show players, Start button for host)
```

**Flow:**

```
Home Screen
    ├─→ Create Room
    │       └─→ Enter Nickname
    │            └─→ Generate 6-digit code
    │                 └─→ Waiting Lobby
    │
    └─→ Join Room
            └─→ Enter Code + Nickname
                 └─→ Waiting Lobby
```

**Implementation:**

```typescript
// useGameRoom.ts
import { sql } from "@vercel/postgres";

function useGameRoom() {
  const createRoom = async (hostNickname: string) => {
    const roomCode = generateRoomCode(); // 6 random digits/letters
    const gameState = createInitialGameState();

    const result = await sql`
      INSERT INTO game_rooms (room_code, game_state, player_count)
      VALUES (${roomCode}, ${JSON.stringify(gameState)}, 1)
      RETURNING id, room_code
    `;

    return { roomId: result.rows[0].id, roomCode: result.rows[0].room_code };
  };

  const joinRoom = async (roomCode: string, nickname: string) => {
    // Find room, add player to game_state, increment player_count
  };

  const pollRoom = (roomId: string, callback: (state) => void) => {
    // Poll for changes every 1-2 seconds (simple!)
  };

  return { createRoom, joinRoom, pollRoom };
}
```

**Deliverable:** Can create room, share code, others can join

---

### Phase 4: Sync Game State (8-10 hours)

**Goal:** All players see the same game state in real-time

**Implementation Strategy (Polling):**

```typescript
// In main game component
const [gameState, setGameState] = useState<GameState>(initialState);
const { updateGameState, getGameState } = useGameRoom();

// Poll for changes every 1.5 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const latestState = await getGameState(roomId);
    if (latestState.updated_at > gameState.updated_at) {
      setGameState(latestState.game_state);
    }
  }, 1500); // 1.5 second polling

  return () => clearInterval(interval);
}, [roomId]);

// When player makes a move
const handleMove = async (row: number, col: number) => {
  const newState = applyMove(gameState, row, col);

  // Optimistic update (instant feedback)
  setGameState(newState);

  // Sync to Neon
  await updateGameState(roomId, newState);
};
};
```

**Turn Validation:**

```typescript
// Simple client-side check (good enough for MVP)
const isMyTurn = gameState.currentPlayerId === myPlayerId;

// Disable clicks if not my turn
<button onClick={() => handleMove(row, col)} disabled={!isMyTurn} />;
```

**Deliverable:** Multiplayer game works end-to-end

---

### Phase 5: Polish & Deploy (4-6 hours)

**Quick Wins:**

- [ ] Add loading states (simple spinners)
- [ ] Add basic error messages (alerts are fine)
- [ ] Add "Copy Link" button for room sharing
- [ ] Add "Leave Game" button
- [ ] Add "Play Again" that creates new room
- [ ] Add basic styling improvements
- [ ] Test with friend on different network

**Deployment:**

```bash
# 1. Push to GitHub
git push origin main

# 2. Connect to Vercel (via UI)
# - Import repository
# - Vercel auto-detects Neon database
# - Deploy

# 3. Done - you have a URL
# Database is already connected via Vercel!
```

**Deliverable:** Live game at bloqueio.vercel.app (or similar)

---

## What We're NOT Building (Yet)

### Intentionally Deferred Features

**If nobody plays your MVP, these don't matter:**

- User authentication (adds 1 week, provides no value until you have repeat users)
- Matchmaking (useless without player base)
- Leaderboards (requires auth + user base)
- Mobile optimization (test on desktop first)
- Accessibility (important, but not for validation)
- Internationalization (start with Portuguese/English)
- Advanced animations (nice-to-have)
- Reconnection (just restart the game)

**How to handle these in MVP:**

- **No account?** Use localStorage for nickname
- **Lost connection?** "Refresh page and rejoin"
- **Want stats?** "Coming soon!"
- **Mobile issues?** "Best on desktop for now"

---

## Success Metrics

### Week 1 Goals (Validation)

| Metric                              | Target   | How to Measure             |
| ----------------------------------- | -------- | -------------------------- |
| Friends who complete a game         | 5-10     | Ask them directly          |
| Organic shares (without you asking) | 2-3      | Check who's creating rooms |
| Games completed                     | 10+      | Neon query                 |
| Average session duration            | > 15 min | Track game start → end     |

### Week 2-4 Goals (Early Traction)

| Metric                           | Target | Method                         |
| -------------------------------- | ------ | ------------------------------ |
| Unique players                   | 50-100 | localStorage IDs               |
| Daily active rooms               | 5-10   | Count active rooms             |
| Return rate (played 2+ times)    | 20%+   | Track localStorage IDs         |
| Completion rate (games finished) | 60%+   | finished_games / started_games |

### Signals You Have Something

✅ **Positive Signals:**

- People share unprompted
- Players return next day
- Games get completed (not abandoned)
- You get questions/feature requests
- Someone asks "when is mobile version?"

🚨 **Warning Signals:**

- Friends play once to be nice, never return
- High abandonment (start but don't finish)
- No one shares organically
- No feature requests (no engagement)

---

## Timeline Breakdown

### Week 1: Build MVP

- **Day 1-2:** Neon setup + minimal refactor
- **Day 3-4:** Create/Join flow
- **Day 5-6:** Sync game state
- **Day 7:** Polish & deploy

### Week 2: Soft Launch

- **Day 8-9:** Test with 5-10 friends
- **Day 10-11:** Fix critical bugs
- **Day 12-13:** Post to small communities (r/boardgames, HN Show)
- **Day 14:** Analyze metrics, decide next steps

### Week 3-4: Iterate or Pivot

- **If good signals:** Implement top 2 requested features
- **If mixed signals:** Try different acquisition channels
- **If bad signals:** Honest conversation about pivoting

---

## Development Commands

```bash
# Setup
pnpm install
pnpm add @neondatabase/serverless

# Development
pnpm dev                 # Start dev server

# Environment variables (.env.local)
# Neon provides DATABASE_URL automatically via Vercel integration
# No manual env vars needed!

# Deployment
git push origin main     # Auto-deploys via Vercel

# Monitoring
# Check Neon dashboard for query performance
# Check Vercel analytics for traffic
```

---

## Risk Mitigation

### Technical Risks

| Risk                          | Probability | Impact | Mitigation                                |
| ----------------------------- | ----------- | ------ | ----------------------------------------- |
| Neon free tier limits         | Low         | Medium | 3GB storage + 100h compute/mo is generous |
| Real-time sync bugs           | High        | Medium | Extensive testing, simple state structure |
| Turn cheating (no validation) | Low         | Low    | Add server validation later if needed     |
| Scaling beyond Neon           | Low         | High   | Cross that bridge if you get there        |

### Business Risks

| Risk             | Probability | Impact | Mitigation                                         |
| ---------------- | ----------- | ------ | -------------------------------------------------- |
| No market demand | Medium      | High   | Fast MVP validates quickly                         |
| Too niche        | Medium      | Medium | Test with broader audience                         |
| Hard to monetize | Medium      | Medium | Plan monetization early (see BUSINESS_STRATEGY.md) |

---

## Appendix: Quick Reference

### Neon Schema (Copy-Paste Ready)

```sql
-- Run this in Neon SQL Editor (or Vercel Storage dashboard)

CREATE TABLE game_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  host_id TEXT NOT NULL,
  game_state JSONB NOT NULL,
  player_count INTEGER DEFAULT 1,
  max_players INTEGER DEFAULT 4,
  status TEXT DEFAULT 'waiting'
);

-- Indexes for performance
CREATE INDEX idx_room_code ON game_rooms(room_code);
CREATE INDEX idx_status ON game_rooms(status);
CREATE INDEX idx_updated_at ON game_rooms(updated_at);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_rooms_updated_at
  BEFORE UPDATE ON game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-delete old rooms (cleanup)
CREATE OR REPLACE FUNCTION delete_old_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM game_rooms
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND status != 'playing';

  DELETE FROM game_rooms
  WHERE created_at < NOW() - INTERVAL '7 days'
    AND status = 'finished';
END;
$$ LANGUAGE plpgsql;

-- You can run this manually or set up a cron job later
```

### Environment Setup Checklist

```bash
# 1. Create Neon database via Vercel
□ Go to Vercel dashboard → Storage tab
□ Click "Create Database"
□ Select "Neon Postgres"
□ Database is automatically created!

# 2. Setup is automatic!
□ Connection string auto-added to .env.local
□ POSTGRES_URL environment variable available
□ No manual config needed

# 3. Run SQL schema
□ Go to Vercel Storage → Query tab
□ Paste schema from above
□ Execute

# 4. Test connection
□ Install: pnpm add @vercel/postgres
□ Import: import { sql } from '@vercel/postgres'
□ Run query to verify
```

---

## Next Steps

After MVP launch and initial validation, see:

- **[BUSINESS_STRATEGY.md](./BUSINESS_STRATEGY.md)** - Monetization & growth plans
- **[SCALING_PLAYBOOK.md](./SCALING_PLAYBOOK.md)** - What to build when traction exists
- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** - Full 28-PR plan (only if scaling)
