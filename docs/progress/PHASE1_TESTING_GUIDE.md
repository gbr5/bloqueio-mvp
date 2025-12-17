# Phase 1 Testing Guide: Bot Integration

## Overview

Phase 1 integration is complete. The bot system is now fully integrated with the game actions and ready for testing. This guide covers how to test the bot system end-to-end.

## What's Been Integrated

### ✅ Core Integration Points

1. **Room Creation** (`room-actions.ts`)
   - Generates `botSeed: crypto.randomUUID()` on every room
   - Initializes `turnNumber: 0`
   - Adds `hostSessionId` for bot management

2. **Game Actions** (`game-actions.ts`)
   - `makeMove()`: Increments `turnNumber`, calls `afterMoveCommit()`
   - `placeBarrier()`: Increments `turnNumber`, calls `afterMoveCommit()`
   - `startGame()`: Calls `onGameStart()` to schedule first bot move

3. **Bot Engine** (`engine.ts`)
   - `applyBotMove()`: Direct DB transaction for pawn movement
   - `applyBotWall()`: Direct DB transaction for barrier placement
   - `checkWin()`: Detects goal achievement
   - Bot chaining: Calls `afterMoveCommit()` at end of move

4. **Worker Deployment** (`/api/cron/process-bot-jobs`)
   - Vercel Cron runs every minute
   - Processes up to 10 pending bot jobs
   - 5-second timeout per job
   - Idempotency via turnNumber validation

## Testing Strategy

### Phase 1.1: Manual Database Testing (No UI Required)

Since the UI for bot selection isn't built yet (Phase 2), we can test the bot system by manually creating bot players in the database.

#### Test 1: Bot vs Bot Game (Simplest Test)

```bash
# 1. Create a test room
pnpm prisma studio

# 2. In Prisma Studio:
#    - Create a Room with gameMode: TWO_PLAYER, allowBots: true
#    - Note the room code (e.g., "TEST01")
#    - Note the room ID

# 3. Create 2 bot players:
#    Player 1:
#      - roomId: <room-id>
#      - playerId: 0
#      - playerType: BOT_EASY
#      - sessionId: null
#      - goalSide: BOTTOM
#      - row: 0, col: 5
#      - wallsLeft: 6
#
#    Player 2:
#      - roomId: <room-id>
#      - playerId: 1
#      - playerType: BOT_EASY
#      - sessionId: null
#      - goalSide: TOP
#      - row: 10, col: 5
#      - wallsLeft: 6

# 4. Start the game (via API or directly in DB):
curl -X POST http://localhost:3000/room/TEST01/start \
  -H "Content-Type: application/json"

# 5. Watch the game unfold:
# - Check BotMoveJob table for scheduled jobs
# - Check BotDecisionLog for move logs
# - Check Player table for position updates
# - Room.turnNumber should increment
```

**Expected Behavior:**
- Worker picks up first job (bot 0)
- Bot 0 makes a move toward BOTTOM
- Worker picks up next job (bot 1)
- Bot 1 makes a move toward TOP
- This continues until one bot wins
- Winner stored in Room.winner

#### Test 2: Human vs Bot Game

```bash
# 1. Create room normally via UI
# 2. Join as human player
# 3. Manually add a bot player in Prisma Studio:
#    - roomId: <from room>
#    - playerId: 1
#    - playerType: BOT_EASY
#    - sessionId: null
#    - goalSide: TOP
#    - row: 10, col: 5
#    - wallsLeft: 6
#
# 4. Start game
# 5. Make a human move
# 6. Worker should schedule bot's turn
# 7. Bot responds within 1 minute (next cron tick)
```

**Expected Behavior:**
- Human moves → turnNumber increments → afterMoveCommit schedules bot
- Bot job created with status: PENDING
- Worker picks up job on next cron tick (max 60 seconds)
- Bot makes valid move
- Turn returns to human

#### Test 3: Bot Replacement Mid-Game

```bash
# 1. Start a 2-player human game
# 2. One player leaves (disconnect)
# 3. Manually update their Player record:
#    - Set playerType: BOT_EASY
#    - Set sessionId: null
#
# 4. Continue playing as remaining human
# 5. Bot should take over abandoned player's turns
```

**Expected Behavior:**
- Bot seamlessly replaces disconnected player
- Game continues without interruption
- Bot plays from abandoned player's position

### Phase 1.2: Worker Validation Tests

#### Test 4: Idempotency (Duplicate Job Prevention)

```sql
-- Manually create duplicate jobs:
INSERT INTO "BotMoveJob" ("code", "playerId", "expectedTurn", "status")
VALUES ('TEST01', 0, 5, 'PENDING');

INSERT INTO "BotMoveJob" ("code", "playerId", "expectedTurn", "status")
VALUES ('TEST01', 0, 5, 'PENDING');
```

**Expected Behavior:**
- Second INSERT fails due to unique constraint `(code, playerId, expectedTurn)`
- Only one job processed

#### Test 5: Stale Job Detection

```sql
-- Create a job for an old turn:
INSERT INTO "BotMoveJob" ("code", "playerId", "expectedTurn", "status")
VALUES ('TEST01', 0, 3, 'PENDING');

-- But room.turnNumber is already 10
```

**Expected Behavior:**
- Worker marks job as STALE
- No move applied
- Error: "Job stale: expected turn 3, room at turn 10"

#### Test 6: Timeout Enforcement

```typescript
// Modify easy.ts to add artificial delay:
export class EasyBotStrategy implements BotStrategy {
  async decide(snapshot: GameSnapshot, rng: SeededRNG): Promise<BotDecision> {
    await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds
    // ... rest of logic
  }
}
```

**Expected Behavior:**
- Job times out after 5 seconds
- Marked as FAILED with error: "Bot decision timed out"
- No move applied

### Phase 1.3: Move Validation Tests

#### Test 7: Valid Pawn Move

```bash
# Bot at (5, 5) with clear path NORTH
# Expected: Move to (4, 5)
```

**Expected Behavior:**
- Player.row updated to 4
- Player.col remains 5
- turnNumber incremented
- Next player's turn scheduled

#### Test 8: Valid Barrier Placement

```bash
# Bot has 6 barriers left
# Expected: Place horizontal barrier near opponent's path
```

**Expected Behavior:**
- Barrier created in database
- Player.wallsLeft decremented to 5
- blockedEdges updated in game state
- Opponent's path still exists (no isolation)

#### Test 9: Invalid Move Detection

```sql
-- Manually block all edges around bot:
INSERT INTO "Barrier" ("roomId", "row", "col", "orientation")
VALUES 
  (<room-id>, 4, 4, 'H'),
  (<room-id>, 5, 4, 'V');
-- (Continue until bot is trapped)
```

**Expected Behavior:**
- Bot detects no valid moves available
- Falls back to valid barrier placement
- If no valid barriers either → FAILED job (edge case)

### Phase 1.4: Bot Chaining Tests

#### Test 10: Bot → Bot → Human Chain

```bash
# Setup: Player order is [Bot Easy, Bot Easy, Human]
# Human makes move
```

**Expected Behavior:**
1. Human move completes
2. `afterMoveCommit()` schedules Bot 1
3. Worker processes Bot 1 → moves
4. Bot 1's `executeBotMove()` calls `afterMoveCommit()`
5. `afterMoveCommit()` schedules Bot 2
6. Worker processes Bot 2 → moves
7. Bot 2's `executeBotMove()` calls `afterMoveCommit()`
8. `afterMoveCommit()` sees next player is Human → no job created
9. Turn returns to Human

**Timing:**
- Each bot move happens on next cron tick (60s intervals)
- Total delay: ~2 minutes for 2 bot moves

### Phase 1.5: Win Detection Tests

#### Test 11: Bot Wins Game

```bash
# Setup: Bot Easy at (1, 5) with goalSide: BOTTOM
# Bot moves to (2, 5) → still playing
# Bot moves to (10, 5) → reaches bottom border → wins
```

**Expected Behavior:**
- `checkWin()` detects row === 10
- Room.winner set to bot's playerId
- Room.status set to FINISHED
- No further jobs scheduled

## Monitoring & Debugging

### Logs to Watch

```bash
# 1. Worker logs (Vercel deployment):
vercel logs --follow

# 2. Job status in database:
SELECT * FROM "BotMoveJob" ORDER BY "createdAt" DESC LIMIT 10;

# 3. Decision logs:
SELECT * FROM "BotDecisionLog" ORDER BY "timestamp" DESC LIMIT 10;

# 4. Room state:
SELECT code, "turnNumber", "currentPlayerId", winner FROM "Room" WHERE code = 'TEST01';
```

### Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| **Bot never moves** | Jobs stuck in PENDING | Check worker is running: `curl http://localhost:3000/api/cron/process-bot-jobs` |
| **Duplicate jobs** | Multiple PENDING for same turn | Unique constraint working correctly (expected) |
| **Stale jobs** | Jobs marked STALE | Normal behavior when turnNumber mismatches |
| **Timeout errors** | Jobs marked FAILED | Bot strategy taking > 5s (check logs) |
| **Invalid moves** | Jobs marked FAILED | Check pathfinding logic or blocked edges |

### Database Queries for Testing

```sql
-- Check bot job queue:
SELECT 
  id, code, "playerId", "expectedTurn", status, error
FROM "BotMoveJob"
WHERE code = 'TEST01'
ORDER BY "createdAt" DESC;

-- Check bot decision history:
SELECT 
  "playerId", "turnNumber", "decisionType", "fromRow", "fromCol", "toRow", "toCol"
FROM "BotDecisionLog"
WHERE "roomCode" = 'TEST01'
ORDER BY "turnNumber" ASC;

-- Check current game state:
SELECT 
  r.code, r."turnNumber", r."currentPlayerId", r.winner,
  p."playerId", p."playerType", p.row, p.col, p."wallsLeft"
FROM "Room" r
LEFT JOIN "Player" p ON p."roomId" = r.id
WHERE r.code = 'TEST01';

-- Check barrier placements:
SELECT 
  row, col, orientation
FROM "Barrier"
WHERE "roomId" = (SELECT id FROM "Room" WHERE code = 'TEST01');
```

## Next Steps (Phase 2: UI Integration)

Once Phase 1 testing validates the bot system works correctly:

1. **Bot Selection UI** (CreateRoom component)
   - Add "Allow Bots" toggle
   - Add "Bot Difficulty" selector per player slot
   - Pre-fill bot players before game starts

2. **Mid-Game Replacement UI** (WaitingLobby component)
   - "Replace with Bot" button for disconnected players
   - Shows which players are bots vs humans

3. **Bot Indicators** (GameBoard component)
   - Visual indicator (🤖 icon) for bot players
   - "Bot is thinking..." message during bot turns
   - Estimated time until next bot move (cron countdown)

4. **Real-time Updates** (Polling improvements)
   - Reduce polling interval to 2-3 seconds (currently 5s)
   - Show bot move animations when detected
   - Optimistic UI for bot scheduling

## Success Criteria for Phase 1

✅ **Complete when all these work:**

- [ ] Bot vs Bot game completes successfully
- [ ] Human vs Bot game works with proper turn sequencing
- [ ] Bot replacement mid-game functions correctly
- [ ] Worker processes jobs within 60 seconds
- [ ] Idempotency prevents duplicate jobs
- [ ] Stale jobs detected and marked
- [ ] 5-second timeout enforced
- [ ] Bot chains work (bot → bot → human)
- [ ] Win detection works for bot victories
- [ ] No crashes or unhandled errors in logs

Once all criteria met → Proceed to Phase 2 (UI Integration)

## Performance Expectations

### Current Bottlenecks (Known)

1. **Cron Interval**: 60 seconds between moves (Vercel Cron limitation)
   - **Impact**: Bot games take ~10-20 minutes
   - **Fix (Phase 3)**: Move to WebSocket + instant processing

2. **Serial Bot Processing**: One bot at a time
   - **Impact**: Minimal (most games have 1-2 bots max)
   - **Fix (Phase 3)**: Parallel processing if needed

3. **No Move Animations**: Bots moves appear instantly on next poll
   - **Impact**: UX feels abrupt
   - **Fix (Phase 2)**: Add transition animations in UI

### Acceptable for MVP
- Bot response time: < 60 seconds ✅
- Human wait time: < 60 seconds for bot turn ✅
- Game completion: 10-20 minutes for bot games ✅

## Timeline

- **Phase 1 Testing**: 1-2 days (manual DB testing + validation)
- **Phase 2 UI**: 2-3 days (bot selection + indicators)
- **Phase 3 Optimization**: Future (only if needed)

## Notes

- **No authentication required for testing**: Use Prisma Studio to manipulate data directly
- **Cron runs automatically on Vercel**: No manual triggering needed in production
- **Local testing**: Call `/api/cron/process-bot-jobs` manually via curl
- **Determinism**: Same botSeed + turnNumber = same bot move (for debugging)
