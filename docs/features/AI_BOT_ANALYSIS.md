# AI Bot System - Deep Analysis (Revised)

**Feature:** Intelligent Bot Players for Bloqueio Game  
**Created:** 2025-12-17  
**Revised:** 2025-12-17 (Senior Engineer Feedback)  
**Status:** Planning Phase  
**Complexity:** High (MVP: 4-5 weeks for 2P | Full: 10-12 weeks with 4P)

---

## 📋 Executive Summary

This document analyzes the requirements, architecture, and challenges for implementing a **server-driven AI bot system** that can play Bloqueio at three difficulty levels. The system must support two distinct use cases:

1. **Pre-game Bot Selection**: Users choose to play against bots before room creation
2. **Dynamic Bot Replacement**: Bots automatically replace disconnected/inactive players mid-game

**Critical Design Principles (Post-Review):**

- ✅ **Server-driven bot turns** - bots are triggered by state transitions, not client requests
- ✅ **MVP-first approach** - 2-player mode only initially, 4-player in Phase 2
- ✅ **Realistic AI complexity** - minimax for 2P, heuristic search for 4P
- ✅ **Wall candidate pruning** - strict limits to prevent exponential search
- ✅ **Concurrency safety** - turnNumber/stateVersion for idempotency
- ✅ **Simulation harness** - validate difficulty tuning before UI polish

**Key Challenges (Revised):**

- Wall placement candidate explosion (not pathfinding)
- Server orchestration with race condition prevention
- Multi-agent complexity in 4-player mode
- Replacement voting deadlock prevention
- Performance guarantees under load

---

## 🎯 Requirements Analysis (Revised)

### Functional Requirements

#### FR1: Bot Difficulty Levels (MVP: 2-Player Mode Only)

**Three distinct AI personalities with realistic complexity:**

1. **Easy (Beginner)**

   - Makes random valid moves 60% of the time
   - Basic pathfinding to goal (BFS shortest path, ignores opponents)
   - Places barriers randomly when available (20% chance per turn)
   - **No lookahead** - purely reactive
   - Simulated "thinking" delay: 1-2 seconds
   - Win rate target: 20-30% vs human players
   - **Implementation:** Random move selection + basic heuristics

2. **Medium (Intermediate)**

   - **Greedy heuristic search** with 1-ply lookahead
   - Evaluates: `ownPathLength - opponentPathLength`
   - Considers blocking opponent's shortest path (simple intersection check)
   - Balances offense (advancing) and defense (blocking) with 60/40 weight
   - **Wall candidate limit:** 20 candidates per turn (only walls on opponent's path)
   - Simulated "thinking" delay: 2-3 seconds
   - Win rate target: 40-50% vs human players
   - **Implementation:** Heuristic evaluation + limited wall search

3. **Hard (Expert) - 2P Mode**
   - **Minimax with alpha-beta pruning** (depth 3 for 2P, time-bounded to 5s max)
   - **Iterative deepening:** start depth 1, increase until time budget exhausted
   - Evaluates: `(ownPathLength - opponentPathLength) + wallAdvantage + positionControl`
   - Predicts opponent optimal moves and counter-strategies
   - **Wall candidate limit:** 40 candidates (opponent path + secondary paths)
   - Simulated "thinking" delay: 3-5 seconds
   - Win rate target: 60-70% vs human players
   - **Implementation:** Time-bounded minimax + move ordering + transposition table

**Hard (Expert) - 4P Mode (Phase 2 Only):**

- **NOT pure minimax** - multi-agent search is exponential
- **Max-N search** with beam pruning (keep top 3 moves per player)
- **Heuristic-driven** with selective 2-ply lookahead
- **Monte Carlo sampling:** 100-200 lightweight rollouts for wall evaluation
- **Wall candidate limit:** 30 candidates (intersection with all opponents' paths)
- **Time budget: 5 seconds hard cap** (4P gets same limit, relies on better pruning)
- **Implementation:** Beam search + MCTS-lite + aggressive pruning

#### FR2: Pre-game Bot Selection

**User flow:**

1. Create room with option "Play with Bots"
2. Select number of bots (1 for 2P mode MVP, 1-3 for 4P Phase 2)
3. Choose difficulty per bot (can mix levels)
4. Room starts immediately when host clicks "Start" (no waiting)
5. Bots take turns **server-side** - client just renders results

**Database changes:**

```prisma
enum PlayerType {
  HUMAN
  BOT_EASY
  BOT_MEDIUM
  BOT_HARD
}

model RoomPlayer {
  id         Int        @id @default(autoincrement())
  roomCode   String
  room       Room       @relation(fields: [roomCode], references: [code])
  playerId   Int        // 0-3 (player position in game)
  userId     String?    // NULL for bots
  sessionId  String?    // NULL for bots
  playerType PlayerType @default(HUMAN)
  name       String     // "Bot (Easy)", "Bot (Medium)", "Bot (Hard)", or user name
  createdAt  DateTime   @default(now())

  @@unique([roomCode, playerId])
  @@index([userId])
  @@index([sessionId])
}

// CRITICAL: No isBot field - always derive from playerType in code
// Derive with: `const isBot = player.playerType !== 'HUMAN'`
```

**Auto-start logic:**

- Room with bots can start with `minPlayers` met (2 for 2P, 2 for 4P)
- No waiting for "all slots filled" - flexibility for mixed human/bot games

#### FR3: Dynamic Bot Replacement (Revised with Concrete Policies)

**Triggers for bot replacement:**

- Player disconnected for >30 seconds (heartbeat failure)
- Player inactive (no move) for >60 seconds during their turn
- Player explicitly leaves game (quit button)

**Replacement Policy Matrix:**

| Mode          | Host Present | Timeout | Default Action                  | Notes                    |
| ------------- | ------------ | ------- | ------------------------------- | ------------------------ |
| **Casual 2P** | Yes          | 15s     | Host decides                    | Replace/Forfeit options  |
| **Casual 2P** | No           | 30s     | **Forfeit disconnected player** | Remaining player wins    |
| **Casual 4P** | Yes          | 15s     | Host decides                    | Replace/Forfeit/Continue |
| **Casual 4P** | No           | 30s     | **Forfeit, continue with 3P**   | If rules support 3P      |
| **Ranked**    | N/A          | 30s     | **Forfeit + rating penalty**    | No replacement allowed   |

**Casual Mode Detailed Flow:**

1. **Disconnect detected** → start timer (30s for heartbeat, 60s for inactivity)
2. **If host present:**
   - Show modal to host: "Player X disconnected. Replace with bot or forfeit?"
   - Options: [Replace (Easy/Medium/Hard)] | [Forfeit Player] | [Wait 30s]
   - If no response in 15s → **default to Forfeit** (not terminate game)
3. **If host also disconnected:**
   - Next active player by playerId order becomes temporary decision-maker
   - Same 15s timeout → defaults to Forfeit
4. **If all humans disconnect:**
   - Room closes after 5 minutes, game marked as abandoned

**Critical Design Decision: Why Forfeit > Terminate**

❌ **Don't default to terminating the game:**

- Punishes players who stayed connected
- Enables griefing (rage-quit → others forced to lose progress)
- Reduces completion rate (defeats purpose of bot replacement)

✅ **Forfeit disconnected player instead:**

- 2P: Remaining player wins immediately
- 4P: Continue with 3 players (or end if rules don't support it)
- Protects experience of active players
- Optional: offer bot replacement as explicit choice

**Ranked/Competitive Mode (Phase 3 - Future):**

1. Detect disconnection
2. Disconnected player has **30 seconds to reconnect**
3. If no reconnect: **automatic forfeit** (no replacement option)
4. Rating adjustment reflects forfeit penalty
5. No voting, no host decisions - strict anti-abuse policy

**Room Setting for Flexibility (Future):**

```typescript
enum DisconnectPolicy {
  FORFEIT_PLAYER    // Default casual - disconnected player loses
  REPLACE_WITH_BOT  // Optional - show replacement modal
  END_MATCH         // Private games - terminate if anyone leaves
}

interface RoomSettings {
  disconnectPolicy: DisconnectPolicy;
  replacementTimeout: number; // Seconds before default action
  allowBotDifficulty: PlayerType[]; // Which bot levels allowed
}
```

**Edge cases with concrete resolutions:**

- **Multiple simultaneous disconnects:** Process sequentially in playerId order
- **Replacement decision during bot turn:** Decision applies at next human turn
- **Host leaves during decision:** Next human player (lowest playerId) inherits decision
- **All options refused:** Forfeit is applied (game doesn't terminate)
- **Player reconnects during decision:** Cancel replacement, resume normally

**Database tracking:**

```prisma
model RoomPlayer {
  // ... existing fields
  replacedAt     DateTime?  // When human was replaced by bot
  wasReplaced    Boolean    @default(false)
  replacedBy     PlayerType? // Which bot type replaced them
  disconnectedAt DateTime?  // Track disconnection time
  forfeitedAt    DateTime?  // When player was forfeited
}

model DisconnectEvent {
  id           String   @id @default(cuid())
  roomCode     String
  playerId     Int
  reason       String   // "HEARTBEAT" | "INACTIVE" | "QUIT"
  detectedAt   DateTime @default(now())
  resolvedAt   DateTime?
  resolution   String?  // "REPLACED" | "FORFEITED" | "RECONNECTED" | "IGNORED"
  decidedBy    Int?     // Which player made the decision (host or temp host)

  @@index([roomCode, resolvedAt])
}
```

### Non-Functional Requirements (Revised)

#### NFR1: Performance & Reliability

- Bot move calculation: **<5 seconds** (Hard 2P), **<10 seconds** (Hard 4P)
- **Time-bounded computation:** iterative deepening with hard cutoff
- Pathfinding optimized for 11x11 grid (BFS with early termination)
- **Server-side computation only** - no client execution (fairness + anti-cheat)
- **Wall candidate pruning:** max 20-40 candidates per turn (prevents exponential search)
- **Concurrent safety:** turnNumber/stateVersion prevents race conditions

#### NFR2: Concurrency & Idempotency (CRITICAL)

**Problem:** Without proper concurrency control, bot moves can duplicate or race.

**Solution - TurnNumber System (Single Source of Truth):**

```prisma
model Room {
  // ... existing fields
  code           String    @unique
  currentTurn    Int       // Player ID (0-3) whose turn it is
  turnNumber     Int       @default(0)  // Increments on every move - idempotency key
  hostId         String?   // First human player (lowest playerId)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}

model BotMoveJob {
  id              String   @id @default(cuid())
  roomCode        String
  playerId        Int
  expectedTurn    Int      // turnNumber when job was created
  status          String   // PENDING | RUNNING | COMPLETED | STALE | FAILED
  createdAt       DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  error           String?

  @@unique([roomCode, playerId, expectedTurn]) // Prevent duplicate jobs
  @@index([roomCode, status])
  @@index([createdAt]) // Cleanup old jobs
}
```

**Idempotency Rules:**

1. Bot move job includes `expectedTurn` when created (= current `room.turnNumber`)
2. Before executing move, verify `room.turnNumber === expectedTurn`
3. If mismatch: mark job as STALE, discard result (game already advanced)
4. After successful move: increment `turnNumber` atomically in same transaction
5. Client polling sees updated `turnNumber`, knows move was applied

**Race Condition Prevention:**

```typescript
// In processBotMove()
await prisma.$transaction(async (tx) => {
  // 1. Lock room row
  const room = await tx.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  // 2. Verify turnNumber matches (idempotency check)
  if (room.turnNumber !== expectedTurn) {
    await tx.botMoveJob.update({
      where: { id: jobId },
      data: { status: "STALE", completedAt: new Date() },
    });
    return; // Discard stale job
  }

  // 3. Compute and validate move
  const move = await botEngine.calculateMove(room, playerId);

  // 4. Apply move + increment turnNumber atomically
  await tx.room.update({
    where: { code: roomCode },
    data: {
      gameState: newGameState,
      currentTurn: nextPlayerId,
      turnNumber: { increment: 1 }, // Atomic increment
      updatedAt: new Date(),
    },
  });

  // 5. Mark job completed
  await tx.botMoveJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
});
```

**Job Processing (Worker Loop for Reliability):**

```typescript
// Background worker (setInterval or cron)
async function processPendingBotJobs() {
  const pendingJobs = await prisma.botMoveJob.findMany({
    where: {
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - 60000) }, // Only recent jobs
    },
    take: 10, // Process in batches
    orderBy: { createdAt: "asc" },
  });

  for (const job of pendingJobs) {
    try {
      await processBotMove(
        job.roomCode,
        job.playerId,
        job.expectedTurn,
        job.id
      );
    } catch (error) {
      await prisma.botMoveJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          error: error.message,
          completedAt: new Date(),
        },
      });
    }
  }
}

// Run every 2 seconds
setInterval(processPendingBotJobs, 2000);
```

**Benefits:**

- **Idempotent:** Same job called multiple times = same result (or discarded if stale)
- **Reliable:** Jobs survive server restarts (stored in DB)
- **No duplicates:** Unique constraint on (roomCode, playerId, expectedTurn)
- **Recoverable:** Failed jobs can be retried or marked for investigation

#### NFR3: Server-Driven Bot Orchestration (NOT Client-Triggered)

**OLD (Problematic) Flow:**

```
Client polls → sees bot turn → calls triggerBotMove() → server computes
Problems: duplicate calls, DoS vector, depends on active client
```

**NEW (Correct) Flow:**

```
Server commits move → advances turn → if next player is bot → schedule bot job
Bot job runs → computes move → applies move → advances turn → repeats if next is bot
```

**Implementation:**

```typescript
// In makeMove() or placeBarrier() server action
async function afterMoveCommit(room: Room) {
  const nextPlayer = room.players.find((p) => p.playerId === room.currentTurn);

  if (nextPlayer?.playerType !== "HUMAN") {
    // Next player is a bot - schedule job
    await scheduleBotMove(room.code, nextPlayer.playerId, room.turnNumber);
  }
}

// Bot job scheduler (can be in-process queue initially, Redis later)
async function scheduleBotMove(
  roomCode: string,
  playerId: number,
  expectedTurn: number
) {
  // Check for existing job (dedupe)
  const existing = await prisma.botMoveJob.findFirst({
    where: {
      roomCode,
      playerId,
      status: { in: ["PENDING", "RUNNING"] },
    },
  });

  if (existing) return; // Already scheduled

  // Create job
  await prisma.botMoveJob.create({
    data: {
      roomCode,
      playerId,
      turnNumber: expectedTurn,
      status: "PENDING",
    },
  });

  // Execute async (or add to job queue)
  processBotMove(roomCode, playerId, expectedTurn).catch(console.error);
}
```

**Benefits:**

- No client dependency - bots work even if all clients disconnect
- No duplicate moves - server controls scheduling
- No DoS attacks - rate limiting at source
- Deterministic - bot turns are automatic state transitions

#### NFR4: User Experience

- Visual "thinking" indicator during bot turns (animated dots)
- **Simulated delay:** even if bot computes in 100ms, delay 1-5s for natural feel
- Animated bot moves with 500ms transition (smooth pawn movement)
- Clear labeling: "Bot (Easy)", "Bot (Medium)", "Bot (Hard)"
- Bot avatars: robot icon 🤖 with color coding by difficulty
- **Performance guarantee:** Hard cap 5 seconds per bot move (all modes)

#### NFR5: Determinism & Debugging

**Problem:** Random bot behavior makes bugs irreproducible.

**Solution:**

```prisma
model Room {
  // ... existing fields
  botSeed      String?  // Seeded RNG for deterministic bot decisions
}

// Separate table for bot decision logs (don't bloat Room row)
model BotDecisionLog {
  id           String   @id @default(cuid())
  roomCode     String
  turnNumber   Int
  playerId     Int
  difficulty   PlayerType
  decision     Json     // { type: "MOVE" | "WALL", row, col, orientation?, score }
  candidates   Json     // Top 5 candidates considered
  timeMs       Int      // Computation time
  createdAt    DateTime @default(now())

  @@index([roomCode, turnNumber])
  @@index([createdAt]) // For cleanup/archival
}
```

**Usage:**

- Generate `botSeed` once when room created with bots
- Use seeded PRNG for all bot randomness (Easy's random moves, Hard's tie-breaking)
- Log every bot decision to separate table (not Json[] on Room - prevents unbounded growth)
- Reproduce exact game via replay with same seed

**Benefits:**

- Bug reports include seed → exact reproduction
- Simulation harness uses seeds for A/B testing
- Fairness audits can verify bot behavior
- Logs are queryable and archivable separately from game state

---

## 🏗️ Architecture Design (Server-Driven)

### System Components (Revised)

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├─────────────────────────────────────────────────────────────┤
│  • BotIndicator Component (shows "thinking" animation)       │
│  • CreateRoomWithBots Component (bot selection UI)           │
│  • BotReplacementModal (host decision + timeout)             │
│  • Polling: detects turnNumber changes, renders bot moves    │
└─────────────────────────────────────────────────────────────┘
                            ↓ (state updates only)
┌─────────────────────────────────────────────────────────────┐
│                    Server Actions Layer                      │
├─────────────────────────────────────────────────────────────┤
│  • createRoomWithBots(botConfigs) → auto-schedules if P0 bot │
│  • afterMoveCommit() → triggers bot scheduler                │
│  • replacePlayerWithBot(roomCode, playerId, difficulty)     │
│  • NO triggerBotMove() - removed, server-driven only        │
│  • checkPlayerActivity(roomCode, playerId)                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    AI Engine Layer                           │
├─────────────────────────────────────────────────────────────┤
│  • BotEngine (main orchestrator)                            │
│    ├─ EasyBot   (random valid moves)                        │
│    ├─ MediumBot (2-3 depth evaluation)                      │
│    └─ HardBot   (minimax + alpha-beta)                      │
│                                                              │
│  • Pathfinding Module (BFS/A* for goal distance)            │
│  • Move Evaluator (scores moves based on game state)        │
│  • Barrier Optimizer (strategic barrier placement)          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  RoomPlayer:                                                 │
│    + playerType: "HUMAN" | "BOT_EASY" | "BOT_MEDIUM" |      │
│                  "BOT_HARD"                                  │
│    + lastActivity: DateTime (for disconnect detection)       │
│    + turnNumber: Int (concurrency control)                  │
│    + botSeed: String? (deterministic randomness)            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Bot Move Execution (Server-Driven)

```
1. Human makes move → server commits → advances turn
   ↓
2. afterMoveCommit() detects next player is bot
   ↓
3. Server schedules bot job (async, with turnNumber)
   ↓
4. BotEngine.calculateMove(gameState, difficulty, seed)
   ├─ Easy:   randomValidMove(seededRNG)
   ├─ Medium: evaluateMoves(1-ply lookahead) → best move
   └─ Hard:   iterativeDeepening(maxDepth 3, 5s timeout) → optimal move
   ↓
5. Bot job verifies turnNumber still matches (idempotency)
   ↓
6. Server validates move (same rules as human)
   ↓
7. Update DB: position, barriers, increment turnNumber
   ↓
8. If next player also bot → schedule another job (chain)
   ↓
9. Client polling detects turnNumber change → re-render
5. Server validates move (same as human validation)
   ↓
6. Update DB: position, barriers, turn, winner check
   ↓
7. Client polling detects state change → re-render
```

---

## 🧠 AI Algorithm Design

### Core Algorithms

#### 1. Pathfinding (BFS/A\*)

**Purpose:** Calculate shortest path from current position to goal

```typescript
interface PathResult {
  distance: number;
  path: Array<{ row: number; col: number }>;
  blocked: boolean; // true if no path exists
}

function findShortestPath(
  startRow: number,
  startCol: number,
  goalSide: GoalSide,
  blockedEdges: Set<string>
): PathResult;
```

**Used by:**

- Easy bot: Move toward goal naively
- Medium bot: Compare own distance vs opponents
- Hard bot: Evaluate position strength

#### 2. **CRITICAL: Wall Candidate Generation** (The Hard Part)

**Problem:** There can be hundreds of valid wall placements. Evaluating all is exponential.

**Solution:** Aggressive pruning with strategic focus.

```typescript
interface WallCandidate {
  baseRow: number;
  baseCol: number;
  orientation: "H" | "V";
  targetPlayer: number; // Which opponent this targets
  pathImpact: number; // Increase in target's path length
}

function generateWallCandidates(
  gameState: GameState,
  botPlayerId: number,
  difficulty: "EASY" | "MEDIUM" | "HARD"
): WallCandidate[] {
  const candidates: WallCandidate[] = [];

  // STEP 1: Identify targets (opponents ahead of us)
  const botPath = findShortestPath(gameState, botPlayerId);
  const opponents = gameState.players.filter((p) => p.id !== botPlayerId);
  const opponentsAhead = opponents.filter((opp) => {
    const oppPath = findShortestPath(gameState, opp.id);
    return oppPath.distance < botPath.distance;
  });

  if (opponentsAhead.length === 0) {
    // We're winning - consider walls on closest opponent
    opponentsAhead.push(getClosestOpponent(opponents, gameState, botPlayerId));
  }

  // STEP 2: Generate candidates only on opponent paths
  for (const opponent of opponentsAhead) {
    const oppPath = findShortestPath(gameState, opponent.id);
    const secondBestPath = findSecondShortestPath(gameState, opponent.id);

    // Strategy: wall candidates that intersect path
    for (let i = 0; i < oppPath.path.length - 1; i++) {
      const cell = oppPath.path[i];

      // Try horizontal wall at this cell
      if (canPlaceWall(gameState, cell.row, cell.col, "H")) {
        const impact = calculatePathImpact(gameState, opponent.id, {
          row: cell.row,
          col: cell.col,
          orientation: "H",
        });

        // CRITICAL: Filter out illegal walls immediately (don't score them)
        if (impact.isLegal) {
          candidates.push({
            baseRow: cell.row,
            baseCol: cell.col,
            orientation: "H",
            targetPlayer: opponent.id,
            pathImpact: impact.delta,
          });
        }
      }

      // Try vertical wall
      if (canPlaceWall(gameState, cell.row, cell.col, "V")) {
        const impact = calculatePathImpact(gameState, opponent.id, {
          row: cell.row,
          col: cell.col,
          orientation: "V",
        });

        // CRITICAL: Filter out illegal walls immediately
        if (impact.isLegal) {
          candidates.push({
            baseRow: cell.row,
            baseCol: cell.col,
            orientation: "V",
            targetPlayer: opponent.id,
            pathImpact: impact.delta,
          });
        }
      }
    }

    // Also consider walls on secondary path (Medium/Hard only)
    if (difficulty !== "EASY" && secondBestPath) {
      for (let i = 0; i < Math.min(secondBestPath.path.length, 3); i++) {
        // Same logic, but limited to first 3 cells
      }
    }
  }

  // STEP 3: Prune by difficulty
  candidates.sort((a, b) => b.pathImpact - a.pathImpact);

  const limits = {
    EASY: 10, // Top 10 walls only
    MEDIUM: 20, // Top 20 walls
    HARD: 40, // Top 40 walls
  };

  return candidates.slice(0, limits[difficulty]);
}

function calculatePathImpact(
  gameState: GameState,
  playerId: number,
  wall: { row: number; col: number; orientation: "H" | "V" }
): { isLegal: boolean; delta: number } {
  // Fast check: temporarily add wall, recompute paths for ALL players
  const originalPath = findShortestPath(gameState, playerId);
  const newGameState = applyWallTemporarily(gameState, wall);

  // CRITICAL: Verify wall doesn't block ANY player completely
  for (const player of newGameState.players) {
    const playerPath = findShortestPath(newGameState, player.id);
    if (playerPath.blocked) {
      // This wall makes game impossible - ILLEGAL
      return { isLegal: false, delta: 0 };
    }
  }

  // Wall is legal - calculate impact on target player
  const newPath = findShortestPath(newGameState, playerId);
  const delta = newPath.distance - originalPath.distance; // Positive = good for bot

  return { isLegal: true, delta };
}
```

**Key Insights:**

- Pathfinding is easy (BFS in 11x11 = fast)
- **Wall candidate explosion is the bottleneck**
- Pruning strategy:
  - Only walls on opponent shortest path + next-best path
  - Sort by impact, keep top N
  - Validate legality (doesn't block own path)
- Without pruning: 200-500 candidates → 5-20 seconds per move
- With pruning: 20-40 candidates → <1 second per move

#### 3. Move Evaluation (Heuristic Scoring)

**Purpose:** Score each possible move based on strategic value

```typescript
interface MoveScore {
  row: number;
  col: number;
  score: number;
  reasoning: string; // For debugging
}

function evaluateMove(
  gameState: GameState,
  playerId: number,
  moveRow: number,
  moveCol: number
): number {
  let score = 0;

  // Factor 1: Distance to goal (higher = better)
  score += (10 - distanceToGoal) * 10;

  // Factor 2: Blocking opponent (if closer than us)
  score += opponentBlockingValue * 5;

  // Factor 3: Avoiding being blocked
  score -= riskOfBeingBlocked * 3;

  // Factor 4: Center control (early game)
  if (earlyGame) score += centerControlBonus;

  return score;
}
```

#### 3. Barrier Placement Strategy

**Purpose:** Decide when and where to place barriers

```typescript
interface BarrierPlacement {
  baseRow: number;
  baseCol: number;
  orientation: "H" | "V";
  value: number; // Strategic value
}

function findBestBarrier(
  gameState: GameState,
  playerId: number
): BarrierPlacement | null {
  // Strategy: Block opponent closest to goal
  const closestOpponent = getClosestOpponentToGoal(gameState);
  const opponentPath = findShortestPath(closestOpponent);

  // Try placing barriers on opponent's path
  const candidates = generateBarrierCandidates(opponentPath);

  // Score each barrier by:
  // 1. How much it increases opponent path length
  // 2. Doesn't block our own path
  // 3. Doesn't help other opponents

  return bestScoredBarrier(candidates);
}
```

#### 4. Minimax with Alpha-Beta Pruning (Hard Bot)

**Purpose:** Look ahead multiple moves to find optimal play

```typescript
function minimax(
  gameState: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean
): number {
  if (depth === 0 || gameState.winner !== null) {
    return evaluateGameState(gameState);
  }

  if (maximizingPlayer) {
    let maxEval = -Infinity;
    for (const move of getPossibleMoves(gameState)) {
      const newState = applyMove(gameState, move);
      const eval = minimax(newState, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, eval);
      alpha = Math.max(alpha, eval);
      if (beta <= alpha) break; // Prune
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of getPossibleMoves(gameState)) {
      const newState = applyMove(gameState, move);
      const eval = minimax(newState, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, eval);
      beta = Math.min(beta, eval);
      if (beta <= alpha) break; // Prune
    }
    return minEval;
  }
}
```

### Difficulty Level Implementation

#### Easy Bot Strategy

```typescript
class EasyBot {
  async makeMove(gameState: GameState): Promise<Move> {
    const possibleMoves = getAllValidMoves(gameState);

    // 60% random, 40% toward goal
    if (Math.random() < 0.6) {
      return randomChoice(possibleMoves);
    } else {
      const goalPath = findShortestPath(gameState);
      return goalPath.path[1]; // Next step toward goal
    }
  }

  async placeBarrier(gameState: GameState): Promise<Barrier | null> {
    // Random barrier placement
    if (Math.random() < 0.3) {
      // Only 30% of time
      const validBarriers = getAllValidBarriers(gameState);
      return randomChoice(validBarriers);
    }
    return null; // Prefer moving
  }
}
```

#### Medium Bot Strategy

```typescript
class MediumBot {
  async makeMove(gameState: GameState): Promise<Move> {
    const possibleMoves = getAllValidMoves(gameState);

    // Score each move
    const scoredMoves = possibleMoves.map((move) => ({
      move,
      score: this.evaluateMoveSimple(gameState, move),
    }));

    // Pick best move with 10% randomness
    scoredMoves.sort((a, b) => b.score - a.score);

    if (Math.random() < 0.1) {
      return randomChoice(scoredMoves.slice(0, 3)).move; // Top 3
    }
    return scoredMoves[0].move; // Best move
  }

  evaluateMoveSimple(gameState: GameState, move: Move): number {
    let score = 0;

    // Distance to goal
    const distAfter = getDistanceToGoal(move.row, move.col);
    score += (10 - distAfter) * 10;

    // Check if blocking opponent
    const opponentDist = getClosestOpponentDistance(gameState);
    if (distAfter < opponentDist) score += 20;

    return score;
  }

  async placeBarrier(gameState: GameState): Promise<Barrier | null> {
    // 50% chance to place barrier if available
    if (Math.random() < 0.5 && this.barriersLeft > 0) {
      return this.findBlockingBarrier(gameState);
    }
    return null;
  }

  findBlockingBarrier(gameState: GameState): Barrier | null {
    // Block player closest to winning
    const closestOpponent = getClosestOpponentToGoal(gameState);
    const path = findShortestPath(closestOpponent);

    // Try to block their 2nd or 3rd step
    const targetCell = path.path[2] || path.path[1];
    return findBarrierToBlockCell(targetCell);
  }
}
```

#### Hard Bot Strategy

```typescript
class HardBot {
  async makeMove(gameState: GameState): Promise<Move> {
    // Use minimax to look ahead 3-4 moves
    const depth = gameState.barriers.length < 10 ? 4 : 3; // Deeper early game

    const possibleMoves = getAllValidMoves(gameState);
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;

    for (const move of possibleMoves) {
      const newState = this.simulateMove(gameState, move);
      const score = this.minimax(
        newState,
        depth - 1,
        -Infinity,
        Infinity,
        false
      );

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  minimax(
    gameState: GameState,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean
  ): number {
    // Terminal conditions
    if (depth === 0 || gameState.winner !== null) {
      return this.evaluatePosition(gameState);
    }

    // Recursive minimax with pruning
    // (Full implementation as shown above)
  }

  evaluatePosition(gameState: GameState): number {
    // Comprehensive position evaluation
    let score = 0;

    // Own distance to goal (lower is better)
    score -= this.getDistanceToGoal(gameState) * 15;

    // Opponent distances (higher is better)
    for (const opponent of this.getOpponents(gameState)) {
      score += this.getDistanceToGoal(opponent) * 8;
    }

    // Barrier advantage
    score += this.barriersLeft * 5;
    score -= this.getOpponentBarriersSum(gameState) * 3;

    // Center control (early game)
    if (gameState.barriers.length < 8) {
      score += this.getCenterControl(gameState) * 10;
    }

    // Path flexibility (multiple routes to goal)
    score += this.countAlternativePaths(gameState) * 7;

    return score;
  }
}
```

---

## 🗄️ Database Schema Changes

### Updated Prisma Schema

```prisma
// PlayerType enum
enum PlayerType {
  HUMAN
  BOT_EASY
  BOT_MEDIUM
  BOT_HARD
}

// RoomPlayer model - per-player data
model RoomPlayer {
  id           String     @id @default(cuid())
  roomCode     String
  room         Room       @relation(fields: [roomCode], references: [code], onDelete: Cascade)
  playerId     Int        // 0-3 (player position in game)
  sessionId    String?    // NULL for bots
  userId       String?    // NULL for bots
  playerName   String

  // Player type (NOT isBot - derive in code)
  playerType   PlayerType @default(HUMAN)
  // Derive isBot with: const isBot = player.playerType !== 'HUMAN'

  // Activity tracking
  lastActivity DateTime   @default(now())
  isActive     Boolean    @default(true)

  // Replacement tracking
  replacedAt     DateTime?  // When human was replaced by bot
  wasReplaced    Boolean    @default(false)
  replacedBy     PlayerType? // Which bot type replaced them
  disconnectedAt DateTime?  // Track disconnection time
  forfeitedAt    DateTime?  // When player was forfeited

  // Game state (denormalized for performance)
  row          Int
  col          Int
  wallsLeft    Int
  goalSide     GoalSide

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([roomCode, playerId])
  @@index([roomCode])
  @@index([sessionId])
  @@index([userId])
}

// Room model - game state
model Room {
  id           String     @id @default(cuid())
  code         String     @unique
  status       RoomStatus @default(WAITING)
  gameMode     GameMode   @default(FOUR_PLAYER)

  // Bot configuration
  allowBots    Boolean    @default(false)
  autofillBots Boolean    @default(false) // Auto-replace disconnected players

  // Game state
  hostId       String?    // First human player (lowest playerId)
  currentTurn  Int        @default(0)  // Player ID (0-3) whose turn it is
  turnNumber   Int        @default(0)  // Increments on every move - idempotency key
  winner       Int?

  // Bot determinism
  botSeed      String?    // Seeded RNG for reproducible bot behavior

  players      RoomPlayer[]

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@index([code])
  @@index([status])
  @@index([turnNumber]) // For bot job queries
}

// Bot job tracking
model BotMoveJob {
  id              String   @id @default(cuid())
  roomCode        String
  playerId        Int
  expectedTurn    Int      // turnNumber when job was created
  status          String   // PENDING | RUNNING | COMPLETED | STALE | FAILED
  createdAt       DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  error           String?

  @@unique([roomCode, playerId, expectedTurn]) // Prevent duplicate jobs
  @@index([roomCode, status])
  @@index([createdAt]) // Cleanup old jobs
}

// Bot decision logs (separate table to prevent Room bloat)
model BotDecisionLog {
  id           String   @id @default(cuid())
  roomCode     String
  turnNumber   Int
  playerId     Int
  difficulty   PlayerType
  decision     Json     // { type: "MOVE" | "WALL", row, col, orientation?, score }
  candidates   Json     // Top 5 candidates considered
  timeMs       Int      // Computation time
  createdAt    DateTime @default(now())

  @@index([roomCode, turnNumber])
  @@index([createdAt]) // For cleanup/archival
}

// Disconnect event tracking
model DisconnectEvent {
  id           String   @id @default(cuid())
  roomCode     String
  playerId     Int
  reason       String   // "HEARTBEAT" | "INACTIVE" | "QUIT"
  detectedAt   DateTime @default(now())
  resolvedAt   DateTime?
  resolution   String?  // "REPLACED" | "FORFEITED" | "RECONNECTED" | "IGNORED"
  decidedBy    Int?     // Which player made the decision (host or temp host)

  @@index([roomCode, resolvedAt])
}
```

### Migration Strategy

1. **Step 1:** Add new columns with defaults
2. **Step 2:** Migrate existing rooms (all players marked HUMAN)
3. **Step 3:** Deploy bot creation logic
4. **Step 4:** Enable bot replacement feature

---

## 🚀 Performance Considerations

### Bottlenecks & Solutions

#### Challenge 1: Minimax Computation Time

**Problem:** Hard bot with depth=4 could take 10+ seconds

**Solutions:**

1. **Iterative Deepening**: Start depth=2, increase if time allows
2. **Move Ordering**: Evaluate promising moves first (better pruning)
3. **Transposition Table**: Cache evaluated positions
4. **Time Limit**: Hard cap at 5 seconds, return best move so far

```typescript
class HardBot {
  async makeMoveWithTimeout(gameState: GameState): Promise<Move> {
    const startTime = Date.now();
    const timeout = 5000; // 5 seconds max

    let bestMove = null;
    let depth = 2;

    // Iterative deepening
    while (Date.now() - startTime < timeout && depth <= 6) {
      const move = this.minimaxWithTimeLimit(
        gameState,
        depth,
        timeout - (Date.now() - startTime)
      );
      if (move) {
        bestMove = move;
        depth++;
      } else {
        break; // Timeout reached
      }
    }

    return bestMove || this.getFallbackMove(gameState);
  }
}
```

#### Challenge 2: Server Load with Multiple Bot Games

**Problem:** 10 concurrent games with bots = heavy CPU usage

**Solutions:**

1. **Queue System**: Process bot moves sequentially
2. **Worker Threads**: Offload computation to separate threads
3. **Redis Cache**: Cache common positions/evaluations
4. **Rate Limiting**: Max 2 bot moves per second per game

#### Challenge 3: Pathfinding Performance

**Problem:** BFS on every move evaluation = O(n²) complexity

**Solutions:**

1. **A\* Algorithm**: More efficient than BFS
2. **Cached Distances**: Pre-compute distance heuristics
3. **Early Termination**: Stop when goal reachable
4. **Optimized Edge Lookup**: Use Map instead of Set for O(1) lookup

---

## 🎮 User Experience Design

### Visual Bot Indicators

```typescript
interface BotPlayerIndicator {
  avatarIcon: "🤖" | "🎯" | "🧠"; // Easy, Medium, Hard
  nameFormat: "Bot (Easy)" | "Bot (Medium)" | "Bot (Hard)";
  thinkingAnimation: "dots" | "spinner" | "brain-pulse";
  moveDelay: 500 | 1000 | 1500; // ms, varies by difficulty
}
```

### Create Room with Bots UI

```
┌─────────────────────────────────────────┐
│  Choose Game Mode                       │
│  ○ 2 Players   ● 4 Players              │
├─────────────────────────────────────────┤
│  Players (4)                            │
│  ┌─────────────────────────────────────┐
│  │ Player 1: You (Host)                │
│  │ Player 2: [Add Bot ▼] [Human ▼]    │
│  │ Player 3: [Add Bot ▼] [Human ▼]    │
│  │ Player 4: [Add Bot ▼] [Human ▼]    │
│  └─────────────────────────────────────┘
├─────────────────────────────────────────┤
│  Bot Difficulty                         │
│  Player 2: [Easy ▼] [Medium] [Hard]    │
│  Player 3: [Easy] [Medium ▼] [Hard]    │
├─────────────────────────────────────────┤
│  [Cancel]           [Start Game]        │
└─────────────────────────────────────────┘
```

### Bot Replacement Modal

```
┌───────────────────────────────────────────┐
│  ⚠️ Player Disconnected                   │
├───────────────────────────────────────────┤
│  "Player 3" has been inactive for 60s.   │
│                                           │
│  Replace with bot?                        │
│                                           │
│  Difficulty: [Easy ▼] [Medium] [Hard]    │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │ ✓ Voting: 2/3 players agree         │ │
│  │   • You: ✓ Replace                  │ │
│  │   • Player 2: ✓ Replace             │ │
│  │   • Player 4: Waiting...            │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  [Cancel]            [Confirm Replace]   │
└───────────────────────────────────────────┘
```

---

## ⚠️ Risks & Mitigation

### Technical Risks

| Risk                                 | Probability | Impact   | Mitigation                                       |
| ------------------------------------ | ----------- | -------- | ------------------------------------------------ |
| Bot too slow (>5s moves)             | Medium      | High     | Iterative deepening, time limits, fallback moves |
| Easy bot too predictable             | High        | Medium   | Add 20% randomness, vary strategies              |
| Hard bot unbeatable                  | Low         | High     | Extensive playtesting, tune evaluation weights   |
| Server overload with bots            | Medium      | High     | Queue system, worker threads, rate limiting      |
| Bot exploits game bugs               | Low         | Critical | Rigorous validation, same rules as humans        |
| Disconnect detection false positives | Medium      | Medium   | Longer timeout (60s), heartbeat mechanism        |

### Business Risks

| Risk                            | Probability | Impact | Mitigation                           |
| ------------------------------- | ----------- | ------ | ------------------------------------ |
| Players prefer humans only      | Medium      | Medium | Make bots optional, clear labeling   |
| Bot games don't count for stats | Low         | Low    | Track bot games separately           |
| Bots reduce engagement          | Low         | High   | Limit bot games in competitive modes |

---

## 🧪 Simulation Harness (Non-Negotiable for Quality)

**Problem:** "Win rate target 60-70%" is wishful thinking without validation.

**Solution:** Build headless simulation infrastructure **before** UI polish.

### Requirements

```typescript
interface SimulationConfig {
  matchups: Array<{
    player1: PlayerType;
    player2: PlayerType;
    gameMode: "TWO_PLAYER" | "FOUR_PLAYER";
  }>;
  iterations: number; // e.g., 1000 games per matchup
  seed?: string; // Reproducible runs
  timeLimit?: number; // Max time per move (ms)
  collectMetrics: boolean; // Detailed logging
}

interface SimulationResults {
  matchup: string; // e.g., "HARD vs MEDIUM"
  gamesPlayed: number;
  player1Wins: number;
  player2Wins: number;
  winRate: number; // Player1 win %
  avgGameLength: number; // Moves per game
  avgMoveTime: number; // Ms per bot move
  wallUsageDistribution: {
    // How many walls used
    mean: number;
    median: number;
    stdDev: number;
  };
  pathLengthDistribution: {
    mean: number;
    min: number;
    max: number;
  };
  errors: number; // Crashes, illegal moves, timeouts
}
```

### Usage Workflow

**Step 1: Baseline Hard Bot**

```bash
npm run simulate -- --p1 BOT_HARD --p2 HUMAN_RANDOM --iterations 100
```

Expected: Hard bot should win 90%+ vs random moves.

**Step 2: Tune Difficulty**

```bash
npm run simulate -- --p1 BOT_HARD --p2 BOT_MEDIUM --iterations 1000
```

Target: Hard wins 65-70% (not 100%, not 50%).

**Step 3: Validate Easy Bot**

```bash
npm run simulate -- --p1 BOT_EASY --p2 HUMAN_GREEDY --iterations 500
```

Target: Easy wins 20-30%.

**Step 4: 4-Player Validation (Phase 2)**

```bash
npm run simulate -- --mode FOUR_PLAYER --bots "HARD,MEDIUM,EASY,EASY" --iterations 100
```

Check:

- Hard wins 40-50% (4P is chaotic, no 70%)
- No infinite loops or crashes
- Move times <5s (hard cap for all modes)

### Critical Metrics to Track

1. **Win Rate Matrix** (2P)

   ```
   |         | vs Easy | vs Med | vs Hard |
   |---------|---------|--------|---------|
   | Easy    |  50%    |  25%   |  10%    |
   | Medium  |  75%    |  50%   |  30%    |
   | Hard    |  90%    |  70%   |  50%    |
   ```

2. **Performance** (CRITICAL: 5s hard cap for all modes)

   - Easy: <1s avg move time
   - Medium: <2s avg move time
   - Hard: <5s avg move time (2P and 4P)
   - 99th percentile <5s (hard cap, no exceptions)

3. **Fairness**

   - First-player advantage <5% (should be ~50% with symmetric bots)
   - Wall usage balanced (not all walls or no walls)
   - Game length reasonable (20-50 moves for 2P, 30-80 for 4P)

4. **Stability**
   - 0 illegal moves
   - 0 pathfinding failures
   - 0 infinite loops
   - <1% timeout rate

### Implementation Priority

**Phase 1: MVP (Required before UI)**

- Headless engine runner (no UI, just game logic)
- Simple CLI: `simulate(player1Type, player2Type, iterations)`
- CSV export: `gameId, winner, moves, wallsUsed, timeMs`

**Phase 1.5: Tuning (Before Hard Bot Release)**

- Real-time dashboard (simple web UI showing live results)
- Heuristic weight explorer (tweak `WALL_WEIGHT`, `POSITION_CONTROL`, etc.)
- Seed replay (reproduce exact game by ID)

**Phase 2: Advanced (4P Validation)**

- Multi-agent matchup matrix (all bot combinations)
- Statistical significance tests (is 65% different from 60%?)
- Performance profiling (which calls are slow)

**Why This Matters:**

- Without simulation: "Hard bot feels too hard" → 2 weeks of blind tuning
- With simulation: "Hard wins 85% not 65%" → adjust weights in 2 hours
- ROI: 1 week building harness saves 4+ weeks of trial-and-error

---

## 📊 Success Metrics

### Development Metrics

- [ ] Easy bot average move time: <2s
- [ ] Medium bot average move time: <3s
- [ ] Hard bot average move time: <5s
- [ ] Easy bot win rate: 20-30%
- [ ] Medium bot win rate: 40-50%
- [ ] Hard bot win rate: 60-70%
- [ ] Bot replacement response time: <10s

### User Engagement Metrics

- % of games with bots (target: 15-25% of total)
- Bot game completion rate (target: >80%)
- User ratings of bot difficulty (1-5 scale)
- Disconnect → bot replacement rate (target: >50%)

---

## 🔄 Future Enhancements

### Phase 2 (Post-MVP)

1. **Machine Learning Bot**: Train on human games
2. **Personalized Difficulty**: Adapt to player skill level
3. **Bot Personalities**: Aggressive, Defensive, Balanced
4. **Tournament Mode**: Humans vs bots leaderboard
5. **Bot Training Matches**: Practice mode for tutorials

### Phase 3 (Advanced)

1. **Collaborative Bots**: Team mode (2v2 with bots)
2. **Bot Replays**: Watch bot games for learning
3. **Custom Bot Scripts**: Users create their own bots
4. **Bot API**: Third-party bot integration

---

## 📚 References

### Algorithm Resources

- [Minimax Algorithm](https://en.wikipedia.org/wiki/Minimax)
- [Alpha-Beta Pruning](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning)
- [A\* Pathfinding](https://www.redblobgames.com/pathfinding/a-star/introduction.html)
- [Game Tree Search](https://www.chessprogramming.org/Search)

### Similar Game AI

- Quoridor AI implementations (GitHub)
- Chess engine design (Stockfish, Leela)
- Go AI (AlphaGo architecture for inspiration)

---

**Next Step:** Review AI_BOT_IMPLEMENTATION_PLAN.md for phased development approach
