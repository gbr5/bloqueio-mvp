# Two-Player Mode Feature Plan

**Feature ID:** `2P-MODE-001`  
**Priority:** Medium  
**Effort Estimate:** 2-3 days  
**Target Release:** v0.2.0

---

## 📋 Executive Summary

Enable a dedicated 2-player game mode where opponents face each other directly (top vs. bottom) with increased strategic depth through 12 barriers per player instead of the standard 6 barriers in 4-player games.

---

## 🎯 User Stories

### US-001: As a player, I want to choose between 2-player and 4-player modes

**Priority:** P0 (Must Have)

**Acceptance Criteria:**

- [ ] Room creation screen displays mode selection (2P vs 4P)
- [ ] Default mode is 4-player for backward compatibility
- [ ] Mode selection is clearly labeled and visually distinct
- [ ] Selected mode is stored with room configuration
- [ ] Mode cannot be changed after room creation

**User Flow:**

```
1. User clicks "Create Room"
2. Modal appears with two options:
   - "2 Players (Classic Duel)" → 12 barriers each
   - "4 Players (Standard)" → 6 barriers each
3. User selects mode
4. Room is created with selected configuration
5. Lobby shows game mode badge/indicator
```

---

### US-002: As a player, I want 2-player games to only show 2 pawns facing each other

**Priority:** P0 (Must Have)

**Acceptance Criteria:**

- [ ] 2-player games show only Player 1 (top) and Player 2 (bottom)
- [ ] Players start at row 1, col 5 and row 9, col 5 respectively
- [ ] Goal sides are BOTTOM (P1) and TOP (P2)
- [ ] Side positions (left/right) are hidden/disabled
- [ ] Game board renders only 2 colors (Red and Green by default)

---

### US-003: As a player, I want 12 barriers in 2-player mode for deeper strategy

**Priority:** P0 (Must Have)

**Acceptance Criteria:**

- [ ] Both players start with `wallsLeft: 12` in 2P mode
- [ ] Barrier counter shows "12/12" at game start
- [ ] UI updates correctly as barriers are placed (11/12, 10/12, etc.)
- [ ] Game ends when player reaches goal OR both run out of barriers
- [ ] 4-player mode remains unchanged (6 barriers per player)

---

### US-004: As a player, I want the waiting lobby to show game mode

**Priority:** P1 (Should Have)

**Acceptance Criteria:**

- [ ] Lobby displays mode badge: "2 Players" or "4 Players"
- [ ] Player slots show only 2 slots for 2P mode
- [ ] "Start Game" button enabled when exactly 2 players joined (2P mode)
- [ ] Maximum players enforced by mode (2 for 2P, 4 for 4P)
- [ ] Error message if player tries to join full 2P room

---

### US-005: As a player, I want balanced gameplay between 2P and 4P modes

**Priority:** P2 (Nice to Have)

**Acceptance Criteria:**

- [ ] Average game duration similar between modes (10-15 minutes)
- [ ] Strategic depth comparable (barrier placement matters equally)
- [ ] No dominant strategy that guarantees wins
- [ ] Pathfinding validation works correctly in both modes

---

## 🏗️ Technical Architecture

### Database Schema Changes

**Schema Update Required:** Yes

```prisma
model Room {
  id          String     @id @default(cuid())
  code        String     @unique
  status      RoomStatus @default(WAITING)
  gameMode    GameMode   @default(FOUR_PLAYER) // NEW FIELD
  hostId      String?
  currentTurn Int        @default(0)
  winner      Int?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  players  Player[]
  barriers Barrier[]
  moves    Move[]

  @@index([code])
  @@index([status])
  @@index([gameMode]) // NEW INDEX
}

enum GameMode {
  TWO_PLAYER   // 2 players, 12 barriers each
  FOUR_PLAYER  // 4 players, 6 barriers each
}
```

**Migration Impact:** Low (new field with default value)

---

### Type System Updates

**File:** `src/types/game.ts`

```typescript
// Add GameMode type
export type GameMode = "TWO_PLAYER" | "FOUR_PLAYER";

// Update GameSnapshot to include mode
export type GameSnapshot = {
  players: Player[];
  blockedEdges: string[];
  barriers: Barrier[];
  currentPlayerId: PlayerId;
  winner: PlayerId | null;
  gameMode: GameMode; // NEW FIELD
};

// Configuration constants
export const GAME_MODE_CONFIG = {
  TWO_PLAYER: {
    maxPlayers: 2,
    wallsPerPlayer: 12,
    minPlayers: 2,
    playerSlots: [0, 2], // Top and Bottom positions only
  },
  FOUR_PLAYER: {
    maxPlayers: 4,
    wallsPerPlayer: 6,
    minPlayers: 2,
    playerSlots: [0, 1, 2, 3], // All positions
  },
} as const;
```

---

### Component Changes

#### 1. CreateRoom Component

**File:** `src/components/CreateRoom.tsx`

**Changes:**

- Add mode selection radio buttons/cards
- Pass selected mode to `createRoom()` action
- Show mode-specific information (player count, barriers)

#### 2. WaitingLobby Component

**File:** `src/components/WaitingLobby.tsx`

**Changes:**

- Display game mode badge
- Limit player slots based on `room.gameMode`
- Adjust "Start Game" validation for 2P mode
- Show correct barrier count in player info

#### 3. GameBoard Component

**File:** `src/app/game.tsx`

**Changes:**

- Accept `gameMode` prop
- Conditionally render 2 or 4 players based on mode
- Initialize correct `wallsLeft` per mode
- Update barrier counter display

---

### Server Action Changes

#### 1. createRoom()

**File:** `src/lib/actions/room-actions.ts`

```typescript
export async function createRoom(
  gameMode: GameMode = "FOUR_PLAYER"
): Promise<{ code: string; playerId: number } | { error: string }> {
  // Validate gameMode
  if (!["TWO_PLAYER", "FOUR_PLAYER"].includes(gameMode)) {
    return { error: "Invalid game mode" };
  }

  const config = GAME_MODE_CONFIG[gameMode];
  const playerConfig = PLAYER_CONFIGS[0]; // Host is always first player

  const room = await db.room.create({
    data: {
      code,
      hostId: sessionId,
      gameMode, // NEW FIELD
      players: {
        create: {
          playerId: 0,
          sessionId,
          userId: session?.user?.id || null,
          name: playerName,
          color: playerConfig.color,
          row: playerConfig.row,
          col: playerConfig.col,
          goalSide: playerConfig.goalSide,
          wallsLeft: config.wallsPerPlayer, // Dynamic based on mode
        },
      },
    },
  });

  return { code: room.code, playerId: 0 };
}
```

#### 2. joinRoom()

**File:** `src/lib/actions/room-actions.ts`

```typescript
export async function joinRoom(code: string) {
  const room = await db.room.findUnique({
    where: { code },
    include: { players: true },
  });

  if (!room) return { error: "Room not found" };

  const config = GAME_MODE_CONFIG[room.gameMode];

  // Check player limit based on game mode
  if (room.players.length >= config.maxPlayers) {
    return { error: `Room is full (${config.maxPlayers} players max)` };
  }

  // Get next available player slot based on mode
  const availableSlots = config.playerSlots.filter(
    (slot) => !room.players.some((p) => p.playerId === slot)
  );

  if (availableSlots.length === 0) {
    return { error: "No available slots" };
  }

  const playerId = availableSlots[0];
  const playerConfig = PLAYER_CONFIGS[playerId];

  // Create player with correct wallsLeft
  const player = await db.player.create({
    data: {
      roomId: room.id,
      playerId,
      sessionId,
      userId: session?.user?.id || null,
      name: playerName,
      color: playerConfig.color,
      row: playerConfig.row,
      col: playerConfig.col,
      goalSide: playerConfig.goalSide,
      wallsLeft: config.wallsPerPlayer, // Dynamic based on mode
    },
  });

  return { playerId: player.playerId };
}
```

#### 3. startGame()

**File:** `src/lib/actions/game-actions.ts`

```typescript
export async function startGame(code: string) {
  const room = await db.room.findUnique({
    where: { code },
    include: { players: true },
  });

  if (!room) return { error: "Room not found" };

  const config = GAME_MODE_CONFIG[room.gameMode];

  // Validate player count based on mode
  if (room.players.length < config.minPlayers) {
    return {
      error: `Need exactly ${config.minPlayers} players for ${room.gameMode} mode`,
    };
  }

  if (room.players.length > config.maxPlayers) {
    return { error: `Too many players for ${room.gameMode} mode` };
  }

  // Additional validation for 2P mode: must have exactly 2 players
  if (room.gameMode === "TWO_PLAYER" && room.players.length !== 2) {
    return { error: "2-player mode requires exactly 2 players" };
  }

  await db.room.update({
    where: { id: room.id },
    data: { status: "PLAYING" },
  });

  return { success: true };
}
```

---

## 📊 Implementation Phases

### Phase 1: Database & Types (Day 1, Morning)

**Duration:** 2-3 hours  
**Status:** ✅ COMPLETE

**Tasks:**

- [x] Create Prisma migration for `gameMode` field
- [x] Run migration on local database
- [x] Update TypeScript types in `src/types/game.ts`
- [x] Add `GAME_MODE_CONFIG` constants
- [ ] Update mock data in tests to include gameMode

**Validation:**

```bash
pnpm prisma migrate dev --name add_game_mode
pnpm prisma generate
pnpm typecheck
pnpm exec prisma migrate deploy
```

---

### Phase 2: Server Actions (Day 1, Afternoon)

**Duration:** 3-4 hours  
**Status:** ✅ COMPLETE

**Tasks:**

- [x] Update `createRoom()` to accept gameMode parameter
- [x] Update `joinRoom()` to enforce mode-based player limits
- [x] Update `startGame()` to validate mode-specific requirements
- [x] Add gameMode to room query responses
- [x] Update player initialization logic for wallsLeft

**Testing:**

```typescript
// Test cases to add
describe("createRoom with gameMode", () => {
  it("should create 2-player room with 12 walls per player", async () => {
    const result = await createRoom("TWO_PLAYER");
    expect(result.code).toBeDefined();

    const room = await db.room.findUnique({
      where: { code: result.code },
      include: { players: true },
    });

    expect(room.gameMode).toBe("TWO_PLAYER");
    expect(room.players[0].wallsLeft).toBe(12);
  });

  it("should default to 4-player mode", async () => {
    const result = await createRoom();
    const room = await db.room.findUnique({
      where: { code: result.code },
    });

    expect(room.gameMode).toBe("FOUR_PLAYER");
  });
});

describe("joinRoom with gameMode", () => {
  it("should reject 3rd player in 2P mode", async () => {
    // Create 2P room + join 2 players
    const result = await joinRoom(twoPlayerRoomCode);
    expect(result.error).toContain("Room is full");
  });

  it("should allow 4 players in 4P mode", async () => {
    // Test all 4 slots work
  });
});
```

---

### Phase 3: UI Components (Day 2, Morning)

**Duration:** 4-5 hours  
**Status:** ✅ COMPLETE

**Tasks:**

- [x] Add mode selection to `CreateRoom.tsx`
- [x] Design mode selection UI (radio cards with visual indicators)
- [x] Update `WaitingLobby.tsx` to show game mode badge
- [x] Limit player slots rendering based on mode
- [x] Update start button validation
- [x] Add mode information tooltip/help text

**Implementation Notes:**

- CreateRoom component now displays two mode cards (2P and 4P) with emoji icons
- Selected mode is passed to createRoom() server action
- WaitingLobby shows game mode badge with appropriate styling
- Player slots are dynamically rendered based on gameMode (2 for 2P, 4 for 4P)
- Start button validation updated to require exact player count for 2P mode
- Fixed React effect warning by initializing guestName from localStorage correctly

**UI Mockup:**

```
┌─────────────────────────────────────┐
│  Create New Game                    │
├─────────────────────────────────────┤
│                                     │
│  Choose Game Mode:                  │
│                                     │
│  ┌──────────────┐  ┌──────────────┐ │
│  │ 🎯 2 Players │  │ 🎲 4 Players │ │
│  │              │  │              │ │
│  │ Classic Duel │  │  Standard    │ │
│  │ 12 Barriers  │  │  6 Barriers  │ │
│  │  Each Side   │  │   Per Side   │ │
│  └──────────────┘  └──────────────┘ │
│     [Selected]        [ ]           │
│                                     │
│         [Create Room]               │
└─────────────────────────────────────┘
```

---

### Phase 4: Game Logic (Day 2, Afternoon)

**Duration:** 3-4 hours  
**Status:** 🔄 IN PROGRESS

**Tasks:**

- [ ] Update `createInitialPlayers()` to accept gameMode
- [ ] Modify player rendering to show only active slots
- [ ] Update barrier counter display (X/12 or X/6)
- [ ] Ensure pathfinding works with 2 players
- [ ] Test jump mechanics with 2 players only
- [ ] Update game state synchronization

**Blockers:**

- Need to integrate gameMode prop into GameBoard component
- Must update game.tsx to handle 2-player initialization
- Barrier counter needs dynamic max value based on mode

**Game.tsx Changes:**

```typescript
interface BloqueioPageProps {
  externalGameState?: GameSnapshot;
  onGameStateChange?: (state: GameSnapshot) => void;
  gameMode?: GameMode; // NEW PROP
}

function createInitialPlayers(gameMode: GameMode = "FOUR_PLAYER"): Player[] {
  const config = GAME_MODE_CONFIG[gameMode];
  const mid = Math.floor(SIZE / 2);

  const allPlayers = [
    { id: 0, row: 1, col: mid, goalSide: "BOTTOM", ... }, // Top
    { id: 1, row: mid, col: SIZE - 2, goalSide: "LEFT", ... }, // Right
    { id: 2, row: SIZE - 2, col: mid, goalSide: "TOP", ... }, // Bottom
    { id: 3, row: mid, col: 1, goalSide: "RIGHT", ... }, // Left
  ];

  // Return only slots needed for this mode
  return config.playerSlots.map(slot => ({
    ...allPlayers[slot],
    wallsLeft: config.wallsPerPlayer,
  }));
}
```

---

### Phase 5: Testing & QA (Day 3, Morning)

**Duration:** 3-4 hours

**Tasks:**

- [ ] Write unit tests for mode selection logic
- [ ] Test 2P room creation and joining
- [ ] Test 4P room creation and joining (regression)
- [ ] Test barrier placement in 2P mode (12 barriers)
- [ ] Test pathfinding validation in 2P mode
- [ ] Test game completion in 2P mode
- [ ] Manual testing: full 2P game flow
- [ ] Manual testing: full 4P game flow (ensure no regression)

**Test Scenarios:**

```
✓ Create 2P room → 2 players join → Start game → Play to completion
✓ Create 2P room → 3rd player tries to join → Rejected
✓ Create 4P room → 4 players join → Start game → Works normally
✓ 2P game: Each player places 12 barriers → All accepted
✓ 2P game: Player tries to place 13th barrier → Rejected
✓ Mixed rooms: 2P and 4P rooms coexist without issues
```

---

### Phase 6: Documentation & Polish (Day 3, Afternoon)

**Duration:** 2-3 hours

**Tasks:**

- [ ] Update `GAME_RULES.md` with 2P mode rules
- [ ] Update README with mode selection info
- [ ] Add migration guide for existing rooms
- [ ] Update UI copy (tooltips, help text)
- [ ] Add analytics tracking for mode selection
- [ ] Performance check: barrier placement with 24 total barriers
- [ ] Accessibility review (mode selection UI)

---

## ✅ Acceptance Testing Checklist

### Functional Requirements

**Room Creation:**

- [ ] Can create 2-player room
- [ ] Can create 4-player room
- [ ] Default mode is 4-player (backward compatibility)
- [ ] Mode is stored in database correctly
- [ ] Mode cannot be changed after creation

**Player Joining:**

- [ ] 2P room accepts max 2 players
- [ ] 4P room accepts max 4 players
- [ ] 3rd player rejected from 2P room with clear error
- [ ] 5th player rejected from 4P room with clear error

**Game Start:**

- [ ] 2P room requires exactly 2 players to start
- [ ] 4P room requires 2-4 players to start
- [ ] Cannot start 2P game with only 1 player
- [ ] Cannot start 2P game with 3+ players

**Gameplay:**

- [ ] 2P game shows 2 pawns only (top and bottom)
- [ ] 4P game shows 4 pawns (all sides)
- [ ] 2P players have 12 barriers each
- [ ] 4P players have 6 barriers each
- [ ] Barrier counter shows correct total
- [ ] Barrier placement works correctly in both modes
- [ ] Pathfinding validation works in both modes
- [ ] Win condition works in both modes

### Non-Functional Requirements

**Performance:**

- [ ] Room creation < 500ms (both modes)
- [ ] Mode selection UI renders instantly
- [ ] 2P game with 24 barriers performs smoothly
- [ ] Database queries unchanged in performance

**Usability:**

- [ ] Mode selection is intuitive
- [ ] Mode badges are clearly visible
- [ ] Error messages are helpful
- [ ] UI adapts gracefully to 2 vs 4 players

**Compatibility:**

- [ ] Existing 4P rooms continue to work
- [ ] Migration doesn't break existing data
- [ ] Both modes work on mobile
- [ ] Both modes work on desktop

---

## 🚨 Edge Cases & Error Handling

### Edge Case 1: Migration of Existing Rooms

**Problem:** Existing rooms don't have `gameMode` field

**Solution:**

```sql
-- Migration sets default to FOUR_PLAYER
ALTER TABLE "Room" ADD COLUMN "gameMode" "GameMode" NOT NULL DEFAULT 'FOUR_PLAYER';
```

**Validation:**

- [ ] All existing rooms default to FOUR_PLAYER
- [ ] Existing players keep 6 barriers
- [ ] No data loss during migration

---

### Edge Case 2: Player Tries to Join Wrong Mode Room

**Scenario:** 2P room is full, player gets generic error

**Solution:**

```typescript
if (room.players.length >= config.maxPlayers) {
  return {
    error:
      room.gameMode === "TWO_PLAYER"
        ? "This 2-player game is full. Please create a new room."
        : "This room is full (4/4 players).",
  };
}
```

---

### Edge Case 3: Host Leaves Before Game Starts (2P Mode)

**Problem:** If host leaves 2P lobby, only 1 player remains

**Solution:**

```typescript
// On player leave in WAITING status
if (room.gameMode === "TWO_PLAYER" && room.players.length < 2) {
  // Auto-close room or transfer host
  await db.room.delete({ where: { id: room.id } });
  return { message: "Room closed (insufficient players)" };
}
```

---

### Edge Case 4: Barrier Counter Overflow (2P Mode)

**Problem:** UI designed for single-digit barrier counts (6 max)

**Solution:**

- Update UI to handle 2-digit counts (12)
- Ensure layout doesn't break
- Test with 12/12, 1/12, 0/12 displays

---

## 📈 Success Metrics

**Adoption Metrics:**

- % of games created as 2P vs 4P
- Average game duration per mode
- Completion rate per mode

**Quality Metrics:**

- Bug reports related to mode selection: 0
- User confusion reports: < 5% of total feedback
- Performance regression: 0% slowdown

**Engagement Metrics:**

- Do 2P games have higher completion rate?
- Do users prefer one mode over the other?
- Does 2P mode lead to more repeat plays?

---

## 🔄 Rollback Plan

**If critical bugs found:**

1. **Database Rollback:**

```bash
pnpm prisma migrate rollback
```

2. **Code Rollback:**

```bash
git revert <commit-hash>
git push origin main
```

3. **Data Recovery:**

```sql
-- If needed, convert all rooms back to FOUR_PLAYER
UPDATE "Room" SET "gameMode" = 'FOUR_PLAYER';
UPDATE "Player" SET "wallsLeft" = 6;
```

4. **Feature Flag (Future):**

```typescript
// Add feature flag for gradual rollout
const ENABLE_TWO_PLAYER_MODE = process.env.NEXT_PUBLIC_ENABLE_2P === "true";
```

---

## 📝 Developer Notes

### Key Design Decisions

**Q: Why 12 barriers in 2P mode?**

- Standard Quoridor uses 10 barriers per player in 2P
- Our 11x11 board is larger than standard 9x9
- 12 barriers provides balanced strategy without over-blocking

**Q: Why enforce exactly 2 players (not 1-2)?**

- Single-player has no opponent (no value)
- Clear UX: "2 Players" means exactly 2
- Simplifies lobby logic

**Q: Why not allow mode switching after creation?**

- Players may have joined expecting specific mode
- WallsLeft would need recalculation
- Simpler to enforce immutable mode

### Future Enhancements

**Phase 2 Features (Post-MVP):**

- [ ] 3-player mode (triangular setup, 8 barriers each)
- [ ] Custom barrier counts (6-15 range)
- [ ] Tournament mode (best of 3, alternating modes)
- [ ] AI opponent for 2P mode
- [ ] Ranked matchmaking per mode

---

## 🎯 Definition of Done

**Feature is complete when:**

- [x] All acceptance criteria met (see checklist above)
- [x] Unit tests passing (>80% coverage for new code)
- [x] Manual QA completed (both 2P and 4P modes)
- [x] Documentation updated
- [x] No regressions in 4P mode
- [x] Performance metrics within acceptable range
- [x] Deployed to production
- [x] Monitored for 24 hours post-deploy (no critical bugs)

---

## 📞 Stakeholders

**Product Owner:** You (Solo Developer)  
**Technical Lead:** You  
**QA:** You  
**Users:** Beta testers, early adopters

**Communication Plan:**

- Update progress daily in `docs/progress/WEEKLY_PROGRESS.md`
- Log blockers in `docs/progress/BLOCKERS.md`
- Demo completed phases to test users

---

## 📚 References

- [Official Quoridor Rules](https://www.ultraboardgames.com/quoridor/game-rules.php) - 2P uses 10 barriers
- [docs/GAME_RULES.md](./GAME_RULES.md) - Current 4P implementation
- [docs/MVP_PLAN.md](./MVP_PLAN.md) - Overall product roadmap
- [Prisma Migration Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2025  
**Status:** ✅ Ready for Implementation
