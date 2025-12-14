# Phase 4: Sync Game State

**Status:** 🚧 In Progress  
**Branch:** `feature/sync-game-state`  
**Duration:** 8-10 hours (estimated)  
**Started:** December 14, 2025

---

## 📋 Overview

Phase 4 implements real-time game state synchronization across all players during active gameplay. This enables true multiplayer functionality where players see each other's moves in real-time.

**Key Deliverable:** 2-4 players can play the game together, seeing moves instantly.

---

## 🎯 Goals

### Primary Goals

1. ✅ Host can start the game from waiting lobby
2. ✅ All players navigate to game board when game starts
3. ✅ Game state syncs across all clients via polling
4. ✅ Turn-based gameplay (only current player can move)
5. ✅ Moves sync instantly across all clients
6. ✅ Win detection works for multiplayer

### Secondary Goals

- Basic error handling for disconnections
- Loading states during sync operations
- Visual feedback for whose turn it is
- "Game Over" screen with winner announcement

---

## 🏗️ Architecture

### Polling Strategy (MVP)

```typescript
// Simple polling every 1.5 seconds
useEffect(() => {
  const interval = setInterval(async () => {
    const latestRoom = await loadGameRoom(roomCode);
    if (latestRoom.game_state.updated_at > currentState.updated_at) {
      setGameState(latestRoom.game_state);
    }
  }, 1500);

  return () => clearInterval(interval);
}, [roomCode]);
```

**Why Polling (not WebSockets)?**

- ✅ Simple - 20 lines of code
- ✅ No extra dependencies
- ✅ Works with serverless (Vercel + Neon)
- ✅ Good enough for turn-based game (1-2s latency is fine)
- ✅ Easy to debug
- ⚠️ Less efficient than WebSockets (acceptable for MVP)

**Future:** Migrate to WebSockets if game becomes real-time (e.g., simultaneous moves)

---

## 📝 Implementation Tasks

### Task 1: Start Game Button ⏳

**Goal:** Host clicks "Start Game" → Room status changes to "playing" → All players navigate to game

**Files to Modify:**

- `src/components/WaitingLobby.tsx` - Add Start Game button logic
- `src/lib/actions/game-room.ts` - Add `startGame()` server action

**Implementation:**

```typescript
// src/lib/actions/game-room.ts
export async function startGame(roomCode: string) {
  return updateGameRoom(roomCode, currentState, "playing");
}

// src/components/WaitingLobby.tsx
const handleStartGame = async () => {
  await startGame(roomCode);
  // Polling will auto-navigate when status changes
};
```

**Acceptance Criteria:**

- [ ] Host sees "Start Game" button (enabled when 2+ players)
- [ ] Clicking starts game (status → "playing")
- [ ] All players auto-navigate to `/room/[code]/game`
- [ ] Polling detects status change within 2 seconds

---

### Task 2: Game Board Component ⏳

**Goal:** Active game page with real game board

**Files to Create/Modify:**

- `src/app/room/[code]/game/page.tsx` - Game page wrapper
- `src/components/GameBoard.tsx` - Main game board component (refactor from `game.tsx`)

**Implementation Strategy:**

1. Extract game logic from `src/app/game.tsx` to reusable component
2. Wrap in multiplayer context with room code
3. Load initial state from database
4. Set up polling for updates

**Acceptance Criteria:**

- [ ] Game board renders correctly
- [ ] Shows all players in correct positions
- [ ] Displays current player indicator
- [ ] Board matches database state

---

### Task 3: Game State Polling ⏳

**Goal:** All clients stay in sync via polling

**Files to Modify:**

- `src/components/GameBoard.tsx` - Add polling logic

**Implementation:**

```typescript
// Poll for game state updates
useEffect(() => {
  const pollInterval = setInterval(async () => {
    const result = await loadGameRoom(roomCode);

    if (result.room) {
      const latestState = result.room.game_state;

      // Only update if state changed (compare updated_at timestamps)
      if (new Date(result.room.updated_at) > lastUpdateTime) {
        setGameState(latestState);
        setLastUpdateTime(new Date(result.room.updated_at));
      }
    }
  }, 1500); // 1.5 second poll

  return () => clearInterval(pollInterval);
}, [roomCode]);
```

**Acceptance Criteria:**

- [ ] Polling runs every 1-2 seconds
- [ ] State updates when database changes
- [ ] No unnecessary re-renders (check timestamps)
- [ ] Cleanup on unmount

---

### Task 4: Turn Validation ⏳

**Goal:** Only current player can make moves

**Files to Modify:**

- `src/components/GameBoard.tsx` - Add turn validation

**Implementation:**

```typescript
// Determine current player ID from URL params or localStorage
const myPlayerId = getMyPlayerId(); // From join/create flow

const isMyTurn = gameState.currentPlayerId === myPlayerId;

// Disable all interactions when not my turn
const handleCellClick = (row: number, col: number) => {
  if (!isMyTurn) {
    alert("Not your turn!");
    return;
  }

  // Process move...
};
```

**Acceptance Criteria:**

- [ ] Player knows their own ID
- [ ] UI shows "Your Turn" or "Player X's Turn"
- [ ] Clicks disabled when not player's turn
- [ ] Visual feedback for current player

---

### Task 5: Move Synchronization ⏳

**Goal:** When player moves, update database and all clients see it

**Files to Modify:**

- `src/components/GameBoard.tsx` - Add move sync logic
- `src/lib/actions/game-room.ts` - Update move handling

**Implementation:**

```typescript
const handleMove = async (row: number, col: number) => {
  // Optimistic update (instant local feedback)
  const newState = applyMove(gameState, myPlayerId, row, col);
  setGameState(newState);

  // Sync to database
  const result = await updateGameRoom(roomCode, newState);

  if (result.error) {
    // Rollback on error
    setGameState(gameState);
    alert("Move failed, please try again");
  }

  // Other clients will see move via polling
};
```

**Acceptance Criteria:**

- [ ] Move updates locally instantly (optimistic)
- [ ] Move syncs to database
- [ ] Other players see move within 2 seconds
- [ ] Error handling with rollback

---

### Task 6: Win Detection & Game End ⏳

**Goal:** Detect winner and show game over screen

**Files to Modify:**

- `src/components/GameBoard.tsx` - Add win detection
- `src/components/GameOver.tsx` - Create game over screen

**Implementation:**

```typescript
// After each move, check for winner
const checkWinner = (state: GameSnapshot) => {
  for (const player of state.players) {
    if (hasReachedGoal(player)) {
      return player.id;
    }
  }
  return null;
};

// Update state with winner
if (winner !== null) {
  const newState = { ...gameState, winner };
  await updateGameRoom(roomCode, newState, "finished");
}
```

**Acceptance Criteria:**

- [ ] Winner detection works correctly
- [ ] All players see winner announcement
- [ ] Game board locks (no more moves)
- [ ] Option to return to lobby or create new game

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] **2-Player Game:**

  - [ ] Create room (Player 1)
  - [ ] Join room (Player 2)
  - [ ] Start game
  - [ ] Both players see board
  - [ ] Player 1 makes move → Player 2 sees it
  - [ ] Player 2 makes move → Player 1 sees it
  - [ ] Game ends correctly

- [ ] **4-Player Game:**

  - [ ] All 4 players join
  - [ ] All see game start
  - [ ] Turns work in sequence (P1→P2→P3→P4→P1...)
  - [ ] All see each other's moves
  - [ ] Winner detection works

- [ ] **Edge Cases:**
  - [ ] Player refreshes page (state persists)
  - [ ] Player closes tab (game continues for others)
  - [ ] Network lag (moves eventually sync)
  - [ ] Invalid moves rejected

---

## 📊 Performance Considerations

### Database Load

**Current:**

- 2 players × 1.5s poll = ~80 requests/min
- 4 players × 1.5s poll = ~160 requests/min

**Neon Free Tier:** 100 hours compute/month = plenty for testing

**Optimization if Needed:**

- Increase poll interval to 2-3s (still acceptable)
- Add exponential backoff when no changes
- Use HTTP caching headers

### State Size

**Current Game State:** ~2KB (4 players + barriers)

- Small enough for JSONB storage
- Fast to parse/stringify
- No optimization needed for MVP

---

## 🐛 Known Issues & TODOs

### Current Session Tracking

**Problem:** How does client know their player ID?

**Options:**

1. **localStorage** - Store player ID when joining/creating
2. **URL param** - Pass as `?playerId=0`
3. **Cookie** - Server-side session

**Decision:** localStorage (simplest for MVP)

```typescript
// On join/create
localStorage.setItem(`room_${roomCode}_playerId`, playerId.toString());

// On game page
const myPlayerId = parseInt(
  localStorage.getItem(`room_${roomCode}_playerId`) || "0"
);
```

### Reconnection Handling

**MVP Approach:** No automatic reconnection

- Player refreshes → Load from database → Continue playing
- Player closes tab → Game continues without them

**Future:** Add reconnection logic if users report issues

---

## 📈 Success Metrics

### Phase 4 Complete When:

- [ ] 2 people can play a full game remotely
- [ ] Moves sync within 2 seconds
- [ ] Winner is detected correctly
- [ ] No major bugs in happy path
- [ ] Code is documented

### Not Required for Phase 4:

- ❌ Perfect reconnection handling
- ❌ Sub-second latency
- ❌ Sophisticated error recovery
- ❌ Mobile optimization
- ❌ Production-ready scaling

**Philosophy:** Ship working multiplayer, iterate based on user feedback

---

## 🔄 Implementation Log

### Session 1: December 14, 2025 (2:00 PM - TBD)

**Starting Point:**

- ✅ Phase 3 merged (create/join flow works)
- ✅ Branch created: `feature/sync-game-state`
- ✅ Documentation created

**Tasks Completed:**

- [ ] Task 1: Start Game Button
- [ ] Task 2: Game Board Component
- [ ] Task 3: Game State Polling
- [ ] Task 4: Turn Validation
- [ ] Task 5: Move Synchronization
- [ ] Task 6: Win Detection

**Blockers:** None currently

**Notes:**

- Starting with Task 1 (Start Game button)
- Using polling strategy (not WebSockets)
- Player ID stored in localStorage

---

## 📚 References

- MVP Plan: `docs/MVP_PLAN.md`
- Phase 3 Documentation: `docs/features/03-create-join-flow.md`
- Database Schema: `scripts/init-db.sql`
- Game Types: `src/types/game.ts`

---

**Last Updated:** December 14, 2025
