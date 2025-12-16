# Phase 0: Optimized Polling Implementation

**Status:** In Progress  
**Timeline:** Next week  
**Goal:** Ship MVP with "good enough" real-time experience

---

## Objectives

### What We're Building

✅ **Optimized polling strategy** for turn-based multiplayer  
✅ **Optimistic UI** for instant local feedback  
✅ **Adaptive intervals** to reduce database load  
✅ **Server validation** with graceful rollback

### Success Criteria

- Moves feel instant to the active player
- Opponent moves appear within 500ms-1s
- No database spam during idle periods
- Illegal moves are caught and rolled back cleanly

---

## Implementation Steps

### Step 1: Adaptive Polling Intervals ✅ PARTIALLY DONE

**Status:** Poll-only-when-not-your-turn already implemented

**Add:** Dynamic interval based on game activity

```typescript
// GameBoard.tsx
const getPollingInterval = (room: Room) => {
  const lastUpdate = new Date(room.updatedAt).getTime();
  const timeSinceUpdate = Date.now() - lastUpdate;

  // Recent activity (< 10s): Fast polling
  if (timeSinceUpdate < 10_000) return 500;

  // Moderate activity (< 1min): Normal polling
  if (timeSinceUpdate < 60_000) return 1000;

  // Idle (< 5min): Slow polling
  if (timeSinceUpdate < 300_000) return 2000;

  // Very idle: Stop polling, show "inactive" message
  return null;
};
```

**Benefit:** Reduces database queries by 50-70% during idle periods

---

### Step 2: Optimistic UI Updates

**Status:** To implement

**Current Flow:**

```
User clicks → Server action → Wait → Refresh → Update UI
```

**New Flow:**

```
User clicks → Update UI immediately → Server action in background
             ↓
         If error → Rollback UI + Show error
```

**Implementation:**

```typescript
// GameBoard.tsx - Optimistic move
const handleOptimisticMove = async (row: number, col: number) => {
  // 1. Optimistic local update
  const optimisticRoom = {
    ...room!,
    players: room!.players.map((p) =>
      p.playerId === myPlayerId ? { ...p, row, col } : p
    ),
    currentTurn: (room!.currentTurn + 1) % room!.players.length,
    updatedAt: new Date(),
  };

  setRoom(optimisticRoom);

  // 2. Server validation in background
  const result = await makeMove(roomCode, row, col);

  // 3. Rollback if error
  if ("error" in result) {
    alert(result.error);
    // Refresh to get correct state
    const fresh = await getRoomState(roomCode);
    if (!("error" in fresh)) setRoom(fresh.room);
  }
};
```

**Benefit:** Instant feedback, no perceived latency

---

### Step 3: Server Validation Improvements

**Status:** To implement

**Current:** Basic turn validation  
**Add:** Comprehensive illegal move detection

```typescript
// game-actions.ts
export async function makeMove(code: string, toRow: number, toCol: number) {
  // ... existing checks ...

  // Add move validation
  const isValidMove = validatePawnMove(
    currentPlayer,
    toRow,
    toCol,
    room.players,
    room.barriers
  );

  if (!isValidMove) {
    return {
      error: "Invalid move",
      reason: "Cannot reach that position",
    };
  }

  // ... proceed with move ...
}
```

**Benefit:** Catch illegal moves server-side, prevent cheating

---

### Step 4: Connection State Indicator

**Status:** Nice-to-have (optional for MVP)

```typescript
// Show connection status
<div className="connection-indicator">
  {isPolling ? "🟢 Live" : "🟡 Updating..."}
</div>
```

**Benefit:** User knows when updates are happening

---

## Technical Details

### Polling Strategy Matrix

| Game State               | Interval   | When                       |
| ------------------------ | ---------- | -------------------------- |
| My turn                  | No polling | Local updates only         |
| Opponent's turn + active | 500ms      | Recent move (< 10s)        |
| Opponent's turn + normal | 1000ms     | Moderate activity (< 1min) |
| Idle game                | 2000ms     | No moves (< 5min)          |
| Very idle                | Stop       | Show "inactive" message    |

### Error Handling

```typescript
// Optimistic update error handling
try {
  setRoom(optimisticState); // Instant UI update
  const result = await serverAction();

  if ("error" in result) {
    // Hard rollback
    await refreshFromServer();
    showError(result.error);
  }
} catch (err) {
  // Network error - retry with exponential backoff
  await retryWithBackoff(serverAction, 3);
}
```

### Database Impact

**Before optimization:**

- 4 active games × 1 query/sec = 4 queries/sec
- 24 hours = 345,600 queries/day

**After optimization:**

- Active turns: 0 queries (local only)
- Opponent turns (recent): 2 queries/sec
- Idle: 0.5 queries/sec
- **~70% reduction in queries**

---

## Implementation Checklist

### Core Features

- [ ] Add adaptive interval calculation
- [ ] Implement optimistic move updates
- [ ] Implement optimistic barrier placement
- [ ] Add server-side move validation
- [ ] Add graceful error rollback
- [ ] Test with 2 players
- [ ] Test with 4 players
- [ ] Test error scenarios (invalid moves)

### Polish

- [ ] Connection state indicator
- [ ] Loading states for actions
- [ ] Better error messages
- [ ] Activity-based interval adjustment

### Testing

- [ ] Two browsers local test
- [ ] Deploy to Vercel staging
- [ ] Test with real network latency
- [ ] Verify database query reduction

---

## Performance Targets

### Perceived Latency

- ✅ Your move: 0ms (instant)
- ✅ Opponent move: 500ms-1s (acceptable)
- ✅ Error feedback: < 100ms (immediate)

### Database Load

- ✅ Active game: 0.5-2 queries/sec (down from 4)
- ✅ Idle game: 0-0.5 queries/sec (down from 1)

### User Experience

- ✅ Moves feel responsive
- ✅ No jarring re-renders
- ✅ Clear error messages
- ✅ Works reliably

---

## Migration Path (Future)

If we validate and need better real-time:

### Phase 1 → Phase 2: Add Pusher

- Keep optimized polling as fallback
- Add Pusher for instant notifications
- Free tier covers validation phase
- **Effort:** 3-4 hours

### Phase 2 → Phase 3: Custom WebSocket

- Only if revenue > $5K/mo
- Full custom backend
- **Effort:** 6-8 weeks

---

## Effort Estimate

| Task               | Time        |
| ------------------ | ----------- |
| Adaptive intervals | 1h          |
| Optimistic updates | 2h          |
| Server validation  | 1h          |
| Error handling     | 1h          |
| Testing            | 1h          |
| **Total**          | **6 hours** |

**Delivery:** End of week (Friday)

---

## Success Metrics

### Technical

- [ ] Database queries reduced by 60%+
- [ ] Zero re-render interference
- [ ] All illegal moves caught server-side

### User Experience

- [ ] 5+ test users report "feels fast enough"
- [ ] No complaints about lag during testing
- [ ] Game completion rate > 80%

---

## Next Steps After Implementation

1. Deploy to Vercel
2. Test with 5-10 friends
3. Collect feedback on responsiveness
4. Decide: Ship or add Pusher
5. Launch MVP 🚀
