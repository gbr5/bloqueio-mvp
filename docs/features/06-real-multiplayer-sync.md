# Phase 6: Real Multiplayer Sync

**Status:** 🚧 In Progress  
**Branch:** `feature/real-multiplayer-sync`  
**Duration:** 8-12 hours (estimated)  
**Started:** December 15, 2025

---

## 📋 Overview

Phase 6 implements true multiplayer functionality by making the game board sync moves across all players in real-time. This addresses the core limitation from Phase 4 where the infrastructure was ready but the game remained local-only.

**Key Deliverable:** All players see each other's moves in real-time, and only the current player can make moves.

---

## 🎯 Goals

### Primary Goals

1. ✅ Fix direct URL access to properly add players to room
2. 🔄 Make BloqueioPage a controlled component
3. 🔄 Enforce turn validation (only current player can move)
4. 🔄 Sync all moves to database in real-time
5. 🔄 All players see moves instantly via polling

### Issues Being Addressed

**Issue #1: Direct URL Access Not Adding Players** ✅
- **Problem:** Copying room URL and pasting in browser didn't add new user to game
- **Solution:** Auto-join logic in lobby page server component
- **Status:** Fixed in commit c41f343

**Issue #2: Single User Can Play for All Players** 🔄
- **Problem:** Any player can click any pawn and make moves
- **Solution:** Turn validation - only current player can interact
- **Status:** In Progress

**Issue #3: Moves Not Syncing Across Players** 🔄
- **Problem:** When one user moves, other players don't see it
- **Solution:** Make game controlled + sync to database + polling updates
- **Status:** In Progress

---

## 🏗️ Architecture

### Current State (Phase 4-5)

```
┌─────────────────┐
│  GameBoard.tsx  │
│  (wrapper)      │
│  - Polling ✅   │
│  - Turn UI ✅   │
│  - Game Over ✅ │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BloqueioPage    │
│ (game.tsx)      │
│ - Local only ❌ │
│ - No sync ❌    │
│ - Uncontrolled  │
└─────────────────┘
```

### Target State (Phase 6)

```
┌─────────────────────────────┐
│      GameBoard.tsx          │
│  - Polling (2s) ✅          │
│  - myPlayerId ✅            │
│  - Turn validation ✅       │
│  - handleMove() → DB 🔄     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  BloqueioPage (controlled)  │
│  - gameState (prop) 🔄      │
│  - onMove callback 🔄       │
│  - disabled={!isMyTurn} 🔄  │
│  - Read-only for others 🔄  │
└─────────────────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  updateGameRoom()           │
│  - Save to Neon DB ✅       │
│  - Broadcast to all 🔄      │
└─────────────────────────────┘
```

---

## 📝 Implementation Tasks

### Task 1: Fix Direct URL Access ✅

**Goal:** Users who paste room link should auto-join the game

**Files Modified:**
- `src/app/room/[code]/lobby/page.tsx`
- `src/components/WaitingLobby.tsx`
- `src/lib/actions/game-room.ts`

**Implementation:**

```typescript
// src/app/room/[code]/lobby/page.tsx
export default async function LobbyPage({ params, searchParams }) {
  const { code } = await params;
  const { isHost, autoJoin } = await searchParams;

  // Auto-join if accessing via direct URL
  if (isHost !== "true" && autoJoin !== "false") {
    const joinResult = await joinGameRoom(code);
    if (!joinResult.error) {
      redirect(`/room/${code}/lobby?isHost=false&autoJoin=false&playerId=${joinResult.playerId}`);
    }
  }
  // ... rest of code
}

// src/components/WaitingLobby.tsx
useEffect(() => {
  const playerIdFromUrl = searchParams.get("playerId");
  if (playerIdFromUrl) {
    localStorage.setItem(`room_${roomCode}_playerId`, playerIdFromUrl);
  }
}, [roomCode, searchParams]);
```

**Testing:**
- ✅ Create room
- ✅ Copy room link
- ✅ Paste in incognito browser
- ✅ Verify player appears in lobby
- ✅ Verify player ID stored in localStorage

**Commit:** `c41f343` - "fix: auto-join players accessing room via direct URL"

---

### Task 2: Make BloqueioPage Controlled ⏳

**Goal:** Convert 1100-line local game to accept external state and callbacks

**Current Problem:**
```typescript
// game.tsx - ALL state is internal
function BloqueioPage() {
  const [players, setPlayers] = useState(createInitialPlayers());
  const [blockedEdges, setBlockedEdges] = useState([]);
  // ... 50+ lines of state
  
  // Moves only update local state - no sync!
  function handleCellClick(row, col) {
    setPlayers(newPlayers); // ❌ Local only
  }
}
```

**Target Solution:**
```typescript
// game.tsx - Controlled component
interface BloqueioPageProps {
  gameState: GameSnapshot;
  onGameStateChange: (newState: GameSnapshot) => void;
  myPlayerId: number | null;
  disabled?: boolean; // Not your turn
}

function BloqueioPage({ 
  gameState, 
  onGameStateChange, 
  myPlayerId,
  disabled 
}: BloqueioPageProps) {
  // Use props instead of local state
  const players = gameState.players;
  const blockedEdges = gameState.blockedEdges;
  
  function handleCellClick(row, col) {
    if (disabled) return; // ✅ Turn validation
    
    const newState = { ...gameState, /* updates */ };
    onGameStateChange(newState); // ✅ Callback to parent
  }
}
```

**Files to Modify:**
- `src/app/game.tsx` (make controlled)
- `src/components/GameBoard.tsx` (connect props)

**Acceptance Criteria:**
- [ ] BloqueioPage accepts `gameState` prop
- [ ] BloqueioPage calls `onGameStateChange` callback
- [ ] No internal state management (use props)
- [ ] Respects `disabled` prop for turn validation
- [ ] Game still works locally (for testing)

---

### Task 3: Connect GameBoard to BloqueioPage ⏳

**Goal:** Wire up the controlled component to multiplayer sync

**Implementation:**

```typescript
// src/components/GameBoard.tsx
export function GameBoard({ roomCode, initialRoom }: GameBoardProps) {
  const [gameState, setGameState] = useState(initialRoom.game_state);
  const [myPlayerId] = useState(() => {
    return parseInt(localStorage.getItem(`room_${roomCode}_playerId`) || "-1");
  });

  // Polling (already exists)
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const result = await loadGameRoom(roomCode);
      if (result.room) {
        setGameState(result.room.game_state); // ✅ Update from DB
      }
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [roomCode]);

  // Handle moves from BloqueioPage
  const handleGameStateChange = async (newState: GameSnapshot) => {
    // Optimistic update
    setGameState(newState);
    
    // Sync to database
    await updateGameRoom(roomCode, newState);
  };

  const isMyTurn = gameState.currentPlayerId === myPlayerId;

  return (
    <div>
      <BloqueioPage
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
        myPlayerId={myPlayerId}
        disabled={!isMyTurn}
      />
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] GameBoard passes state to BloqueioPage
- [ ] Moves sync to database via `updateGameRoom`
- [ ] Polling updates state from database
- [ ] Turn validation prevents moves when not your turn
- [ ] Optimistic updates for instant feedback

---

### Task 4: Turn Validation UI ⏳

**Goal:** Clear visual feedback for whose turn it is

**Implementation:**

```typescript
// In BloqueioPage
function handleCellClick(row, col) {
  if (disabled) {
    // Show toast/alert
    alert("Not your turn!");
    return;
  }
  // ... proceed with move
}

// Add visual overlay when disabled
{disabled && (
  <div className="absolute inset-0 bg-black/30 cursor-not-allowed z-40">
    <div className="text-center mt-20 text-white text-2xl">
      Waiting for your turn...
    </div>
  </div>
)}
```

**Acceptance Criteria:**
- [ ] Visual indicator when not your turn
- [ ] Clicks disabled when not your turn
- [ ] Clear message: "Waiting for Player X"
- [ ] Turn indicator updates in real-time

---

### Task 5: Testing & Debugging ⏳

**Test Cases:**

1. **Two Browser Test**
   - [ ] Create room in Browser A
   - [ ] Join in Browser B (incognito)
   - [ ] Start game
   - [ ] Player 1 moves → Player 2 sees move (< 3s)
   - [ ] Player 2 tries to move on P1's turn → Blocked
   - [ ] Player 2's turn → Player 1 sees move

2. **Three Player Test**
   - [ ] 3 players join
   - [ ] Turn rotation works correctly (P1 → P2 → P3 → P1)
   - [ ] All players see all moves
   - [ ] No player can move out of turn

3. **Edge Cases**
   - [ ] Player refreshes page → Reconnects with correct player ID
   - [ ] Player leaves → Game continues for others
   - [ ] Network lag → Moves eventually sync
   - [ ] Winner detected → All players see game over modal

**Debugging Tools:**
- [ ] Console logs for all state changes
- [ ] Network tab to verify polling
- [ ] Neon console to check database updates

---

## 🔍 Known Limitations (MVP)

**Intentionally NOT Implemented (defer to Phase 7+):**

- ❌ Reconnection handling (if player disconnects)
- ❌ Undo moves in multiplayer
- ❌ Chat between players
- ❌ Spectator mode
- ❌ Game history/replay
- ❌ WebSocket real-time (using polling for MVP)

**Why:** These add weeks of complexity. Validate users want the core game first.

---

## 📊 Success Metrics

**Phase 6 Complete When:**

- ✅ Direct URL access adds players correctly
- ✅ Only current player can make moves
- ✅ All players see moves within 3 seconds
- ✅ Turn indicator updates correctly
- ✅ Game ends properly for all players
- ✅ Tested with 2-3 real users on different networks

---

## 🔄 Rollback Plan

If multiplayer sync breaks the game:

1. **Revert to Phase 5:** Game remains local-only but functional
2. **Feature flag:** Add `ENABLE_MULTIPLAYER_SYNC` env var
3. **Fix forward:** Debug specific issue and redeploy

---

## 📝 Development Log

### Day 1 (December 15, 2025)

**Completed:**
- ✅ Task 1: Fixed direct URL access (commit c41f343)
- ✅ Created feature branch: `feature/real-multiplayer-sync`
- ✅ Documented architecture and approach

**In Progress:**
- 🔄 Task 2: Making BloqueioPage controlled

**Blockers:** None

**Time Spent:** 2 hours

---

## 📚 References

- **MVP Plan:** `docs/MVP_PLAN.md` (Phase 4 architecture)
- **Phase 4 Docs:** `docs/features/04-sync-game-state.md` (polling setup)
- **Phase 5 Docs:** `docs/features/05-polish-and-deploy.md` (Game Over modal)
- **Game Types:** `src/types/game.ts` (GameSnapshot interface)
- **Server Actions:** `src/lib/actions/game-room.ts` (updateGameRoom)
- **Original Game:** `src/app/game.tsx` (1100-line local game)

---

## 🎯 Next Steps After Phase 6

**If Multiplayer Works:**
1. Deploy to production
2. Test with 10-15 real users
3. Collect feedback
4. Decide: monetization vs more features

**If Issues Found:**
1. Document bugs
2. Prioritize critical vs nice-to-have
3. Fix critical first
4. Re-test

---

**Last Updated:** December 15, 2025  
**Next Review:** After Task 2 completion
