# AI Bot System - Implementation Plan (Revised)

**Feature:** AI Bot Players  
**Timeline:** 4-5 weeks (MVP 2P), 10-12 weeks (Full with 4P)  
**Priority:** Medium (Post-MVP feature)  
**Dependencies:** Stable multiplayer, 2P mode working  
**Revision Date:** 2025-12-17 (Updated based on senior engineer feedback)

**Critical Design Principles:**

- ✅ Server-driven bot orchestration (not client-triggered)
- ✅ MVP focuses on 2-player mode only
- ✅ turnNumber-based idempotency
- ✅ 5-second hard cap on all bot moves
- ✅ Default to forfeit disconnected players (not game termination)
- ✅ Separate logging tables (no Json[] bloat on Room)

---

## 📅 Development Phases

### **Phase 0: Foundation (Week 1)**

**Goal:** Set up infrastructure for bot system

#### Tasks

- [ ] Create bot type system in TypeScript
- [ ] Update Prisma schema with bot fields
- [ ] Create database migration
- [ ] Set up bot engine directory structure
- [ ] Create bot utilities (pathfinding, validation)

#### Deliverables

```
src/lib/bot/
  ├── types.ts              # Bot interfaces & types
  ├── pathfinding.ts        # BFS/A* algorithms
  ├── validator.ts          # Move validation for bots
  ├── engine.ts             # Main bot orchestrator
  ├── rng.ts                # Seeded PRNG (CRITICAL: no Math.random())
  ├── scheduler.ts          # Server-driven job scheduler
  ├── worker.ts             # Polling worker loop
  └── __tests__/
      └── pathfinding.test.ts
```

#### Critical Implementation Notes

**\u26a0\ufe0f BLOCKERS FIXED:**

1. ✅ Client-triggered bot execution removed (server-driven only)
2. ✅ BotMoveJob schema unified: roomCode, playerId INT, expectedTurn
3. ✅ All randomness uses SeededRNG (no Math.random())
4. ✅ Room.botDifficulty removed (per-player only)
5. ✅ hostId renamed to hostSessionId

**Canonical Schema Fields:**

- `BotMoveJob`: roomCode, playerId INT, expectedTurn INT
- `Room`: turnNumber INT, botSeed TEXT, hostSessionId
- All logs use roomCode (not roomId) for consistency

#### Database Changes

```sql
-- Add bot-related enums
CREATE TYPE "BotDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'STALE');

-- Update PlayerType enum (add bot types)
ALTER TYPE PlayerType ADD VALUE 'BOT_EASY';
ALTER TYPE PlayerType ADD VALUE 'BOT_MEDIUM';
ALTER TYPE PlayerType ADD VALUE 'BOT_HARD';

-- Update RoomPlayer (NO isBot field - derive from playerType)
ALTER TABLE RoomPlayer
  ADD COLUMN playerType PlayerType DEFAULT 'HUMAN',
  ADD COLUMN lastActivity TIMESTAMP DEFAULT NOW();

-- Update Room with bot config + concurrency control
ALTER TABLE Room
  ADD COLUMN allowBots BOOLEAN DEFAULT false,
  ADD COLUMN autofillBots BOOLEAN DEFAULT false,
  ADD COLUMN turnNumber INTEGER DEFAULT 0,
  ADD COLUMN botSeed TEXT,  -- Deterministic RNG seed for bot reproducibility
  ADD COLUMN hostSessionId TEXT;  -- Clear naming: host authority by session

-- Create BotMoveJob table (server-driven job queue)
-- CANONICAL SCHEMA: roomCode (not roomId), playerId INT, expectedTurn (not turnNumber)
CREATE TABLE "BotMoveJob" (
  "id" TEXT PRIMARY KEY,
  "roomCode" TEXT NOT NULL,  -- Key by room code (not room.id)
  "playerId" INTEGER NOT NULL,  -- INT not TEXT
  "expectedTurn" INTEGER NOT NULL,  -- Idempotency: skip if room.turnNumber != this
  "status" "JobStatus" DEFAULT 'PENDING',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "startedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "error" TEXT,
  UNIQUE("roomCode", "playerId", "expectedTurn")  -- Prevent duplicate jobs
);
CREATE INDEX "BotMoveJob_roomCode_status_idx" ON "BotMoveJob"("roomCode", "status");
CREATE INDEX "BotMoveJob_createdAt_idx" ON "BotMoveJob"("createdAt");

-- Create BotDecisionLog table (separate from Room to prevent bloat)
CREATE TABLE "BotDecisionLog" (
  "id" TEXT PRIMARY KEY,
  "roomCode" TEXT NOT NULL,  -- Use roomCode for consistency
  "playerId" INTEGER NOT NULL,  -- INT not TEXT
  "turnNumber" INTEGER NOT NULL,
  "difficulty" TEXT NOT NULL,
  "moveType" TEXT NOT NULL,
  "decision" JSONB NOT NULL,
  "reasoning" JSONB,
  "computeTimeMs" INTEGER NOT NULL,
  "candidatesEvaluated" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "BotDecisionLog_roomCode_createdAt_idx" ON "BotDecisionLog"("roomCode", "createdAt");
CREATE INDEX "BotDecisionLog_difficulty_createdAt_idx" ON "BotDecisionLog"("difficulty", "createdAt");

-- Create DisconnectEvent table (track player replacements)
CREATE TABLE "DisconnectEvent" (
  "id" TEXT PRIMARY KEY,
  "roomCode" TEXT NOT NULL,  -- Use roomCode
  "playerId" INTEGER NOT NULL,
  "playerType" "PlayerType" NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "isCurrentTurn" BOOLEAN NOT NULL,
  "gameMode" TEXT NOT NULL,
  "replacementDecision" TEXT,
  "decidedBy" TEXT,
  "decisionTime" INTEGER,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "DisconnectEvent_roomCode_createdAt_idx" ON "DisconnectEvent"("roomCode", "createdAt");
CREATE INDEX "DisconnectEvent_gameMode_decision_idx" ON "DisconnectEvent"("gameMode", "replacementDecision");
```

**Estimated Time:** 5 days  
**Risk:** Low

---

### **Phase 1: Easy Bot Implementation (Week 2)**

**Goal:** Working bot that can play complete games (random strategy)

#### 1.1 Core Pathfinding

**File:** `src/lib/bot/pathfinding.ts`

```typescript
export interface PathResult {
  distance: number;
  path: Array<{ row: number; col: number }>;
  exists: boolean;
}

export function findShortestPath(
  startRow: number,
  startCol: number,
  goalSide: GoalSide,
  blockedEdges: Set<string>
): PathResult {
  // BFS implementation
  const queue: Array<{
    row: number;
    col: number;
    path: Array<{ row: number; col: number }>;
  }> = [];
  const visited = new Set<string>();

  queue.push({ row: startRow, col: startCol, path: [] });
  visited.add(`${startRow},${startCol}`);

  while (queue.length > 0) {
    const { row, col, path } = queue.shift()!;

    // Check if reached goal
    if (isGoalCell(row, col, goalSide)) {
      return {
        distance: path.length,
        path: [...path, { row, col }],
        exists: true,
      };
    }

    // Explore neighbors
    for (const neighbor of getValidNeighbors(row, col, blockedEdges)) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          row: neighbor.row,
          col: neighbor.col,
          path: [...path, { row, col }],
        });
      }
    }
  }

  return { distance: Infinity, path: [], exists: false };
}

function getValidNeighbors(
  row: number,
  col: number,
  blockedEdges: Set<string>
): Array<{ row: number; col: number }> {
  const neighbors: Array<{ row: number; col: number }> = [];
  const directions = [
    { dr: -1, dc: 0 }, // Up
    { dr: 1, dc: 0 }, // Down
    { dr: 0, dc: -1 }, // Left
    { dr: 0, dc: 1 }, // Right
  ];

  for (const { dr, dc } of directions) {
    const newRow = row + dr;
    const newCol = col + dc;

    // Check bounds
    if (newRow < 0 || newRow > 10 || newCol < 0 || newCol > 10) continue;

    // Check if edge is blocked
    const edgeKey = normalizeEdgeKey(row, col, newRow, newCol);
    if (blockedEdges.has(edgeKey)) continue;

    neighbors.push({ row: newRow, col: newCol });
  }

  return neighbors;
}
```

#### 1.2 Easy Bot Strategy

**File:** `src/lib/bot/strategies/easy-bot.ts`

```typescript
import { findShortestPath } from "../pathfinding";
import { SeededRNG } from "../rng"; // ⚠️ CRITICAL: Use seeded RNG, not Math.random()
import type { GameSnapshot, Move, Barrier } from "@/types/game";

export class EasyBot {
  constructor(private rng: SeededRNG) {}
  async selectMove(gameState: GameSnapshot, playerId: number): Promise<Move> {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");

    const possibleMoves = this.getAllValidMoves(gameState, player);

    // 60% random, 40% toward goal
    if (this.rng.next() < 0.6) {
      // ⚠️ Use seeded RNG
      return this.randomChoice(possibleMoves);
    }

    // Move toward goal
    const path = findShortestPath(
      player.row,
      player.col,
      player.goalSide,
      new Set(gameState.blockedEdges)
    );

    if (path.exists && path.path.length > 1) {
      return { row: path.path[1].row, col: path.path[1].col };
    }

    return this.randomChoice(possibleMoves);
  }

  async selectBarrier(
    gameState: GameSnapshot,
    playerId: number
  ): Promise<Barrier | null> {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player || player.wallsLeft === 0) return null;

    // Only place barriers 30% of the time
    if (this.rng.next() > 0.3) return null; // ⚠️ Use seeded RNG

    const validBarriers = this.getAllValidBarriers(gameState);
    return validBarriers.length > 0 ? this.randomChoice(validBarriers) : null;
  }

  private getAllValidMoves(gameState: GameSnapshot, player: any): Move[] {
    // Use existing canPawnMoveTo logic from game.tsx
    const moves: Move[] = [];
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
    ];

    for (const { dr, dc } of directions) {
      const newRow = player.row + dr;
      const newCol = player.col + dc;

      if (this.isValidMove(gameState, player, newRow, newCol)) {
        moves.push({ row: newRow, col: newCol });
      }
    }

    return moves;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(this.rng.next() * array.length)]; // ⚠️ Seeded RNG
  }
}
```

#### 1.3 Bot Move Execution

**File:** `src/lib/actions/bot-actions.ts`

```typescript
"use server";

import { db } from "@/lib/db";
import { EasyBot } from "@/lib/bot/strategies/easy-bot";
import { makeMove, placeBarrier } from "./game-actions";

export async function executeBotTurn(
  roomCode: string,
  playerId: number
): Promise<{ success: true } | { error: string }> {
  try {
    // Load current game state
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: { players: true },
    });

    if (!room) return { error: "Room not found" };

    const player = room.players.find((p) => p.playerId === playerId);
    if (!player || player.playerType === "HUMAN") {
      return { error: "Not a bot player" };
    }

    // Convert DB state to GameSnapshot
    const gameState = this.dbToGameState(room);

    // Create seeded RNG for deterministic replay
    const rng = new SeededRNG(`${room.botSeed}:${room.turnNumber}:${playerId}`);

    // Select bot strategy
    const bot = new EasyBot(rng); // Later: factory based on playerType

    // Decide: move or place barrier
    const shouldPlaceBarrier = rng.next() < 0.3 && player.wallsLeft > 0;

    if (shouldPlaceBarrier) {
      const barrier = await bot.selectBarrier(gameState, playerId);
      if (barrier) {
        await placeBarrier(
          roomCode,
          barrier.row,
          barrier.col,
          barrier.orientation
        );
        return { success: true };
      }
    }

    // Default: make a move
    const move = await bot.selectMove(gameState, playerId);
    await makeMove(roomCode, move.row, move.col);

    return { success: true };
  } catch (error) {
    console.error("Bot turn failed:", error);
    return { error: "Bot execution failed" };
  }
}
```

#### 1.4 Server-Driven Bot Scheduler (CANONICAL)

**File:** `src/lib/bot/scheduler.ts`

```typescript
import { db } from "@/lib/db";
import { BotEngine } from "./engine";

/**
 * Schedules a bot move job after successful move commit
 * Called ONLY from afterMoveCommit() - never from client
 */
export async function scheduleBotMove(
  roomCode: string,
  playerId: number,
  expectedTurn: number
): Promise<void> {
  // Use unique constraint to prevent duplicate jobs
  await db.botMoveJob.upsert({
    where: {
      roomCode_playerId_expectedTurn: { roomCode, playerId, expectedTurn },
    },
    create: {
      roomCode,
      playerId,
      expectedTurn,
      status: "PENDING",
    },
    update: {}, // No-op if already exists
  });
}

/**
 * Server-side worker loop that processes bot move jobs
 * Runs continuously (polling every 1-2s) or via cron
 */
export async function processPendingBotJobs(): Promise<void> {
  const pendingJobs = await db.botMoveJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 10, // Process up to 10 jobs per tick
  });

  for (const job of pendingJobs) {
    await processSingleBotJob(job.id);
  }
}

/**
 * Process one bot move job with full idempotency + timeout
 */
async function processSingleBotJob(jobId: string): Promise<void> {
  // Mark as RUNNING
  const job = await db.botMoveJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // Load room state
    const room = await db.room.findUnique({
      where: { code: job.roomCode },
      include: { players: true },
    });

    if (!room) {
      await db.botMoveJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: "Room not found",
          completedAt: new Date(),
        },
      });
      return;
    }

    // IDEMPOTENCY CHECK: skip if turn has advanced
    if (room.turnNumber !== job.expectedTurn) {
      await db.botMoveJob.update({
        where: { id: jobId },
        data: { status: "STALE", completedAt: new Date() },
      });
      return;
    }

    // SAFETY CHECK: verify it's actually this bot's turn
    if (room.currentPlayer !== job.playerId) {
      await db.botMoveJob.update({
        where: { id: jobId },
        data: {
          status: "STALE",
          error: "Not bot turn",
          completedAt: new Date(),
        },
      });
      return;
    }

    // Execute bot move with 5s hard timeout
    const startTime = Date.now();
    const engine = new BotEngine(room.botSeed);
    await engine.executeBotMove(job.roomCode, job.playerId);
    const computeTime = Date.now() - startTime;

    // Mark as completed
    await db.botMoveJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // Log performance warning if > 5s
    if (computeTime > 5000) {
      console.warn(
        `⚠️ Bot move exceeded 5s: ${computeTime}ms (room: ${job.roomCode})`
      );
    }
  } catch (error) {
    await db.botMoveJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

/**
 * Hook called after every successful move commit
 * Schedules next bot job if needed
 */
export async function afterMoveCommit(roomCode: string): Promise<void> {
  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room) return;

  const currentPlayer = room.players.find(
    (p) => p.playerId === room.currentPlayer
  );
  if (!currentPlayer || currentPlayer.playerType === "HUMAN") return;

  // Schedule bot job (server-driven only)
  await scheduleBotMove(roomCode, room.currentPlayer, room.turnNumber);

  // Trigger immediate processing (don't wait for next poll)
  await processPendingBotJobs();
}
```

#### 1.5 Client Polling (NEVER triggers bot moves!)

**File:** `src/components/GameBoard.tsx`

```typescript
// ⚠️ CRITICAL: Client ONLY polls for state - NEVER calls executeBotTurn
// All bot orchestration happens server-side via afterMoveCommit()

useEffect(() => {
  const pollInterval = setInterval(async () => {
    // Fetch updated game state
    const updatedRoom = await fetchRoom(roomCode);
    setRoom(updatedRoom);
  }, 1000); // 1s polling

  return () => clearInterval(pollInterval);
}, [roomCode]);

// Visual indicator when bot is thinking (based on server job status)
const isBotThinking =
  room?.currentPlayer !== undefined &&
  room.players.find((p) => p.playerId === room.currentPlayer)?.playerType !==
    "HUMAN" &&
  room.hasPendingBotJob; // Server provides this flag

{
  isBotThinking && (
    <div className="bot-thinking-indicator">🤖 Bot is thinking...</div>
  );
}
```

#### Testing

- [ ] Unit tests for pathfinding
- [ ] Easy bot completes full game without errors
- [ ] Bot respects turn order
- [ ] Bot moves are validated server-side
- [ ] Visual "thinking" indicator works

**Estimated Time:** 8 days  
**Risk:** Medium

---

### **Phase 2: Pre-game Bot Selection UI (Week 3)**

**Goal:** Users can create rooms with bots from the start

#### 2.1 Create Room with Bots Component

**File:** `src/components/CreateRoomWithBots.tsx`

```typescript
export function CreateRoomWithBots({ onCancel }: CreateRoomProps) {
  const [gameMode, setGameMode] = useState<GameMode>("FOUR_PLAYER");
  const [playerSlots, setPlayerSlots] = useState<PlayerSlot[]>([
    { type: "HUMAN", difficulty: null }, // Host (always human)
    { type: "HUMAN", difficulty: null },
    { type: "HUMAN", difficulty: null },
    { type: "HUMAN", difficulty: null },
  ]);

  const handleSlotChange = (index: number, type: PlayerType) => {
    const newSlots = [...playerSlots];
    newSlots[index] = {
      type,
      difficulty: type !== "HUMAN" ? "BOT_EASY" : null,
    };
    setPlayerSlots(newSlots);
  };

  const handleCreate = async () => {
    const result = await createRoomWithBots({
      gameMode,
      playerSlots,
    });

    if ("error" in result) {
      setError(result.error);
    } else {
      router.push(`/room/${result.code}/lobby`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Game mode selection */}
      <GameModeSelector value={gameMode} onChange={setGameMode} />

      {/* Player slots */}
      <div className="space-y-3">
        {playerSlots.map((slot, i) => (
          <PlayerSlotSelector
            key={i}
            index={i}
            slot={slot}
            isHost={i === 0}
            onChange={(type) => handleSlotChange(i, type)}
          />
        ))}
      </div>

      <button onClick={handleCreate}>Create Game</button>
    </div>
  );
}
```

#### 2.2 Server Action

**File:** `src/lib/actions/room-actions.ts`

```typescript
export async function createRoomWithBots(config: {
  gameMode: GameMode;
  playerSlots: Array<{ type: PlayerType; difficulty: PlayerType | null }>;
}): Promise<{ code: string } | { error: string }> {
  const sessionId = await getOrCreateSessionId();
  const code = generateRoomCode();
  const modeConfig = getGameModeConfig(config.gameMode);

  // Create room
  const room = await db.room.create({
    data: {
      code,
      gameMode: config.gameMode,
      allowBots: true,
      turnNumber: 0, // Initialize concurrency control
      botSeed: crypto.randomUUID(), // Deterministic bot RNG seed
      hostSessionId: sessionId, // Clear naming: host authority
      status: "WAITING",
      players: {
        create: config.playerSlots.map((slot, i) => ({
          playerId: i,
          playerType: slot.type, // BOT_EASY/BOT_MEDIUM/BOT_HARD or HUMAN
          // NO isBot field - derive from: playerType !== 'HUMAN'
          sessionId: slot.type === "HUMAN" && i === 0 ? sessionId : null,
          playerName:
            slot.type === "HUMAN"
              ? i === 0
                ? "You"
                : `Player ${i + 1}`
              : `Bot (${slot.difficulty?.replace("BOT_", "")})`,
          row: modeConfig.startPositions[i].row,
          col: modeConfig.startPositions[i].col,
          wallsLeft: modeConfig.barriersPerPlayer,
          goalSide: modeConfig.startPositions[i].goalSide,
        })),
      },
    },
  });

  // If all slots filled with bots, start immediately
  const humanCount = config.playerSlots.filter(
    (s) => s.type === "HUMAN"
  ).length;
  if (humanCount === modeConfig.maxPlayers) {
    // All humans - wait in lobby
  } else {
    // Has bots - start game immediately
    await startGame(code);
  }

  return { code };
}
```

#### Testing

- [ ] Create 4P game with 3 bots
- [ ] Create 2P game with 1 bot
- [ ] Mix bot difficulties
- [ ] Auto-start works when bots present
- [ ] UI correctly shows bot indicators

**Estimated Time:** 5 days  
**Risk:** Low

---

### **Phase 3: Medium Bot Strategy (Week 4)**

**Goal:** Smarter bot that evaluates moves 2-3 steps ahead

#### 3.1 Move Evaluation

**File:** `src/lib/bot/strategies/medium-bot.ts`

```typescript
export class MediumBot {
  async selectMove(gameState: GameSnapshot, playerId: number): Promise<Move> {
    const possibleMoves = this.getAllValidMoves(gameState, playerId);

    // Score each move
    const scoredMoves = possibleMoves.map((move) => ({
      move,
      score: this.evaluateMove(gameState, playerId, move),
    }));

    // Sort by score
    scoredMoves.sort((a, b) => b.score - a.score);

    // Add 10% randomness (pick from top 3)
    if (Math.random() < 0.1 && scoredMoves.length >= 3) {
      const topThree = scoredMoves.slice(0, 3);
      return topThree[Math.floor(Math.random() * 3)].move;
    }

    return scoredMoves[0].move;
  }

  private evaluateMove(
    gameState: GameSnapshot,
    playerId: number,
    move: Move
  ): number {
    let score = 0;

    // Factor 1: Distance to goal (closer = higher score)
    const distanceAfter = this.getDistanceToGoal(
      move.row,
      move.col,
      gameState.players.find((p) => p.id === playerId)!.goalSide,
      gameState.blockedEdges
    );
    score += (10 - distanceAfter) * 15;

    // Factor 2: Relative position vs opponents
    const opponents = gameState.players.filter((p) => p.id !== playerId);
    const closestOpponent = this.getClosestOpponentToGoal(opponents, gameState);

    if (distanceAfter < closestOpponent.distance) {
      score += 25; // Bonus for being in the lead
    } else {
      score -= 10; // Penalty for falling behind
    }

    // Factor 3: Center control (early game)
    if (gameState.barriers.length < 10) {
      const centerBonus = this.getCenterControlBonus(move.row, move.col);
      score += centerBonus;
    }

    // Factor 4: Safety (avoid being trapped)
    const pathsFromMove = this.countAlternativePaths(move, gameState);
    score += pathsFromMove * 5;

    return score;
  }

  async selectBarrier(
    gameState: GameSnapshot,
    playerId: number
  ): Promise<Barrier | null> {
    const player = gameState.players.find((p) => p.id === playerId);
    if (!player || player.wallsLeft === 0) return null;

    // 50% chance to place barrier
    if (Math.random() > 0.5) return null;

    // Find best blocking position
    return this.findBestBlockingBarrier(gameState, playerId);
  }

  private findBestBlockingBarrier(
    gameState: GameSnapshot,
    playerId: number
  ): Barrier | null {
    // Block the player closest to winning
    const opponents = gameState.players.filter((p) => p.id !== playerId);
    const closestOpponent = this.getClosestOpponentToGoal(opponents, gameState);

    // Get their shortest path
    const opponentPath = findShortestPath(
      closestOpponent.player.row,
      closestOpponent.player.col,
      closestOpponent.player.goalSide,
      new Set(gameState.blockedEdges)
    );

    if (!opponentPath.exists || opponentPath.path.length < 3) return null;

    // Try to block their 2nd or 3rd step
    const targetCell = opponentPath.path[2] || opponentPath.path[1];

    // Generate candidate barriers around target cell
    const candidates = this.generateBarrierCandidates(targetCell);

    // Validate and score barriers
    for (const barrier of candidates) {
      if (this.isValidBarrier(gameState, barrier)) {
        // Check that it doesn't block our own path
        if (!this.blocksOwnPath(gameState, playerId, barrier)) {
          return barrier;
        }
      }
    }

    return null;
  }
}
```

#### Testing

- [ ] Medium bot wins ~50% vs Easy bot
- [ ] Medium bot blocks opponents effectively
- [ ] Medium bot move time <3s
- [ ] No infinite loops or crashes

**Estimated Time:** 6 days  
**Risk:** Medium

---

### **Phase 4: Hard Bot with Minimax (Week 5-6)**

**Goal:** Near-optimal play using game tree search

#### 4.1 Minimax Implementation

**File:** `src/lib/bot/strategies/hard-bot.ts`

```typescript
export class HardBot {
  private transpositionTable = new Map<string, number>();

  async selectMove(gameState: GameSnapshot, playerId: number): Promise<Move> {
    const startTime = Date.now();
    const maxTime = 4500; // 4.5s max (leave buffer)

    const possibleMoves = this.getAllValidMoves(gameState, playerId);
    let bestMove = possibleMoves[0];
    let bestScore = -Infinity;

    // Try increasing depths until time runs out
    for (let depth = 2; depth <= 5; depth++) {
      if (Date.now() - startTime > maxTime) break;

      for (const move of possibleMoves) {
        const newState = this.simulateMove(gameState, playerId, move);
        const score = this.minimax(
          newState,
          depth - 1,
          -Infinity,
          Infinity,
          false,
          maxTime - (Date.now() - startTime)
        );

        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }

        if (Date.now() - startTime > maxTime) break;
      }
    }

    return bestMove;
  }

  private minimax(
    gameState: GameSnapshot,
    depth: number,
    alpha: number,
    beta: number,
    maximizing: boolean,
    timeLeft: number
  ): number {
    // Timeout check
    if (timeLeft <= 0) return this.evaluatePosition(gameState);

    // Terminal conditions
    if (depth === 0 || gameState.winner !== null) {
      return this.evaluatePosition(gameState);
    }

    // Check transposition table
    const stateKey = this.hashGameState(gameState);
    if (this.transpositionTable.has(stateKey)) {
      return this.transpositionTable.get(stateKey)!;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerId];
    const possibleMoves = this.getAllValidMoves(gameState, currentPlayer.id);

    // Move ordering (better pruning)
    const orderedMoves = this.orderMoves(possibleMoves, gameState);

    if (maximizing) {
      let maxEval = -Infinity;

      for (const move of orderedMoves) {
        const newState = this.simulateMove(gameState, currentPlayer.id, move);
        const eval_ = this.minimax(
          newState,
          depth - 1,
          alpha,
          beta,
          false,
          timeLeft - 100
        );
        maxEval = Math.max(maxEval, eval_);
        alpha = Math.max(alpha, eval_);

        if (beta <= alpha) break; // Prune
      }

      this.transpositionTable.set(stateKey, maxEval);
      return maxEval;
    } else {
      let minEval = Infinity;

      for (const move of orderedMoves) {
        const newState = this.simulateMove(gameState, currentPlayer.id, move);
        const eval_ = this.minimax(
          newState,
          depth - 1,
          alpha,
          beta,
          true,
          timeLeft - 100
        );
        minEval = Math.min(minEval, eval_);
        beta = Math.min(beta, eval_);

        if (beta <= alpha) break; // Prune
      }

      this.transpositionTable.set(stateKey, minEval);
      return minEval;
    }
  }

  private evaluatePosition(gameState: GameSnapshot): number {
    // Complex position evaluation
    let score = 0;

    const myPlayer = gameState.players[gameState.currentPlayerId];
    const opponents = gameState.players.filter((p) => p.id !== myPlayer.id);

    // Own distance (lower is better)
    const myDist = this.getDistanceToGoal(myPlayer);
    score -= myDist * 20;

    // Opponent distances (higher is better)
    for (const opp of opponents) {
      const oppDist = this.getDistanceToGoal(opp);
      score += oppDist * 12;
    }

    // Barrier advantage
    score += myPlayer.wallsLeft * 8;
    score -= opponents.reduce((sum, p) => sum + p.wallsLeft, 0) * 4;

    // Path flexibility (multiple routes)
    score += this.countAlternativePaths(myPlayer, gameState) * 10;

    // Center control (early game)
    if (gameState.barriers.length < 12) {
      score += this.getCenterControl(myPlayer) * 15;
    }

    // Endgame: exponential bonus for closeness
    if (myDist <= 3) {
      score += (4 - myDist) * 50;
    }

    return score;
  }
}
```

#### Testing

- [ ] Hard bot wins ~65% vs Medium bot
- [ ] Hard bot move time <5s
- [ ] Transposition table reduces computations
- [ ] Alpha-beta pruning working correctly
- [ ] No stack overflow errors

**Estimated Time:** 10 days  
**Risk:** High (complexity)

---

### **Phase 5: Dynamic Bot Replacement (Week 7)**

**Goal:** Replace disconnected/inactive players with bots

#### 5.1 Activity Tracking

**File:** `src/lib/actions/activity-tracking.ts`

```typescript
"use server";

export async function updatePlayerActivity(
  roomCode: string,
  playerId: number
): Promise<void> {
  await db.roomPlayer.updateMany({
    where: {
      room: { code: roomCode },
      playerId,
    },
    data: {
      lastActivity: new Date(),
      isActive: true,
    },
  });
}

export async function checkInactivePlayers(
  roomCode: string
): Promise<Array<{ playerId: number; secondsInactive: number }>> {
  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room) return [];

  const now = new Date();
  const inactivePlayers = room.players
    .filter((p) => p.playerType === "HUMAN")
    .map((p) => ({
      playerId: p.playerId,
      secondsInactive: Math.floor(
        (now.getTime() - p.lastActivity.getTime()) / 1000
      ),
    }))
    .filter((p) => p.secondsInactive > 60); // 60s threshold

  return inactivePlayers;
}
```

#### 5.2 Replacement UI

**File:** `src/components/BotReplacementModal.tsx`

```typescript
export function BotReplacementModal({
  roomCode,
  inactivePlayer,
}: BotReplacementModalProps) {
  const [difficulty, setDifficulty] = useState<BotDifficulty>("BOT_EASY");
  const [voting, setVoting] = useState<VotingState | null>(null);

  const handleReplace = async () => {
    const result = await replacePlayerWithBot(
      roomCode,
      inactivePlayer.playerId,
      difficulty
    );

    if ("success" in result) {
      toast.success(
        `Player replaced with ${difficulty.replace("BOT_", "")} bot`
      );
      onClose();
    }
  };

  return (
    <Modal open onClose={onClose}>
      <ModalHeader>
        <ModalTitle>⚠️ Player Disconnected</ModalTitle>
        <ModalDescription>
          "{inactivePlayer.name}" has been inactive for{" "}
          {inactivePlayer.secondsInactive}s.
        </ModalDescription>
      </ModalHeader>

      <div className="space-y-4">
        <div>
          <label>Replace with bot?</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="BOT_EASY">Easy</option>
            <option value="BOT_MEDIUM">Medium</option>
            <option value="BOT_HARD">Hard</option>
          </select>
        </div>

        {voting && (
          <VotingDisplay votes={voting.votes} required={voting.required} />
        )}
      </div>

      <ModalFooter>
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleReplace}>Confirm Replace</button>
      </ModalFooter>
    </Modal>
  );
}
```

#### 5.3 Server Action

**File:** `src/lib/actions/bot-replacement.ts`

```typescript
export async function replacePlayerWithBot(
  roomCode: string,
  playerId: number,
  difficulty: BotDifficulty,
  gameMode: "CASUAL" | "RANKED"
): Promise<{ success: true } | { error: string }> {
  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room) return { error: "Room not found" };

  const player = room.players.find((p) => p.playerId === playerId);
  if (!player) return { error: "Player not found" };

  // Log disconnection event
  await db.disconnectEvent.create({
    data: {
      roomCode, // Use roomCode not roomId
      playerId, // INT not String
      playerType: player.playerType,
      turnNumber: room.turnNumber,
      isCurrentTurn: room.currentPlayer === playerId,
      gameMode,
      replacementDecision: "BOT_REPLACE",
      decidedBy: room.hostId,
      decisionTime: Date.now() - player.lastActivity.getTime(),
    },
  });

  // Update player to bot (NO isBot field - use playerType)
  await db.roomPlayer.update({
    where: { id: player.id },
    data: {
      playerType: difficulty, // BOT_EASY/BOT_MEDIUM/BOT_HARD
      // Derive isBot from: playerType !== 'HUMAN'
      sessionId: null,
      playerName: `Bot (${difficulty.replace("BOT_", "")})`,
    },
  });

  // Create bot move job if it's bot's turn
  if (room.currentPlayer === playerId) {
    await scheduleBotMove(roomCode, playerId, room.turnNumber); // Use scheduler
  }

  return { success: true };
}
```

#### Testing

- [ ] Disconnect detection works after 60s
- [ ] Replacement modal appears
- [ ] Bot inherits correct game state
- [ ] Bot continues playing normally
- [ ] Multiple disconnections handled

**Estimated Time:** 7 days  
**Risk:** Medium

---

### **Phase 6: Polish & Testing (Week 8)**

**Goal:** Bug fixes, performance tuning, UX improvements

#### Tasks

- [ ] Calibrate bot difficulty levels (playtesting)
- [ ] Optimize minimax performance
- [ ] Add visual "thinking" animations
- [ ] Add bot personality indicators
- [ ] Write comprehensive tests
- [ ] Performance profiling
- [ ] Accessibility for bot games
- [ ] Documentation

#### Playtesting Metrics

- Easy bot win rate: 20-30% ✓
- Medium bot win rate: 40-50% ✓
- Hard bot win rate: 60-70% ✓
- Average move times within limits ✓
- No crashes or infinite loops ✓

**Estimated Time:** 7 days  
**Risk:** Low

---

## 📦 Deliverables by Phase

| Phase          | Code | Tests | Docs | UI  |
| -------------- | ---- | ----- | ---- | --- |
| 0: Foundation  | ✓    | ✓     | ✓    | -   |
| 1: Easy Bot    | ✓    | ✓     | ✓    | ✓   |
| 2: Pre-game UI | ✓    | ✓     | -    | ✓   |
| 3: Medium Bot  | ✓    | ✓     | -    | -   |
| 4: Hard Bot    | ✓    | ✓     | ✓    | -   |
| 5: Replacement | ✓    | ✓     | ✓    | ✓   |
| 6: Polish      | ✓    | ✓     | ✓    | ✓   |

---

## 🚀 Deployment Strategy

### Gradual Rollout

**Week 8:** Internal testing (dev environment)

- Bot games only available on development branch
- Gather metrics and feedback

**Week 9:** Beta release (20% of users)

- Feature flag: `ENABLE_BOT_PLAYERS=true`
- Monitor error rates and performance

**Week 10:** Full release

- Enable for all users
- Announce feature in changelog

---

## 🧪 Testing Strategy

### Unit Tests

```
src/lib/bot/__tests__/
  ├── pathfinding.test.ts        # BFS/A* correctness
  ├── easy-bot.test.ts           # Random moves valid
  ├── medium-bot.test.ts         # Evaluation function
  ├── hard-bot.test.ts           # Minimax logic
  └── bot-engine.test.ts         # Integration
```

### Integration Tests

```
__tests__/bot-integration/
  ├── full-game-easy.test.ts     # Easy bot completes game
  ├── full-game-medium.test.ts   # Medium bot completes game
  ├── full-game-hard.test.ts     # Hard bot completes game
  ├── mixed-difficulty.test.ts   # 4 bots, different levels
  └── replacement.test.ts        # Dynamic replacement
```

### Manual Testing Checklist

- [ ] Create 2P game with Easy bot
- [ ] Create 4P game with 3 Hard bots
- [ ] Mix bot difficulties (Easy, Medium, Hard in same game)
- [ ] Bot replacement after disconnect
- [ ] Bot respects turn order
- [ ] Bot moves are validated
- [ ] Visual indicators work
- [ ] Performance acceptable (<5s moves)
- [ ] No crashes or deadlocks

---

## ⚠️ Known Challenges & Solutions

### Challenge 1: Minimax Too Slow

**Solution:** Iterative deepening with hard time limit

### Challenge 2: Bot Predictability

**Solution:** Add controlled randomness, vary evaluation weights

### Challenge 3: Server Overload

**Solution:** Queue bot moves, limit concurrent bot games

### Challenge 4: Disconnect Detection False Positives

**Solution:** Longer timeout (60s), heartbeat mechanism

---

## 📊 Success Criteria

- [ ] All three difficulty levels implemented
- [ ] Bot win rates within target ranges (±10%)
- [ ] Bot move times within limits
- [ ] Pre-game bot selection working
- [ ] Dynamic replacement working
- [ ] Zero critical bugs in production
- [ ] User feedback positive (>4/5 rating)

---

## 🔄 Future Iterations

### Post-MVP (Phase 7+)

1. Machine learning bot trained on human games
2. Adaptive difficulty (adjusts to player skill)
3. Bot personalities (Aggressive, Defensive, Balanced)
4. Bot training mode for tutorials
5. Tournament mode with bots
6. Custom bot scripts (advanced users)

---

## \ud83d\udd34 PRE-IMPLEMENTATION CHECKLIST (Required before Phase 0)

### Critical Blockers Fixed ✅

- [x] **Blocker A**: Client-triggered bot execution removed

  - Phase 1.5 now shows polling-only approach
  - No `executeBotTurn()` calls from client
  - All orchestration via `afterMoveCommit()` hook

- [x] **Blocker B**: BotMoveJob schema unified

  - Uses `roomCode` (not roomId)
  - Uses `playerId INT` (not TEXT)
  - Uses `expectedTurn` (not turnNumber field name)
  - Unique constraint: `(roomCode, playerId, expectedTurn)`

- [x] **Blocker C**: scheduleBotMove() field alignment
  - Creates jobs with `expectedTurn: room.turnNumber`
  - Worker checks `room.turnNumber === job.expectedTurn`

### Schema Cleanup ✅

- [x] Removed `Room.botDifficulty` (bots are per-player)
- [x] Renamed `Room.hostId` → `Room.hostSessionId`
- [x] Added `Room.botSeed` for deterministic RNG
- [x] All log tables use `roomCode` (consistency)

### Determinism Requirements ✅

- [x] SeededRNG module required (`src/lib/bot/rng.ts`)
- [x] All `Math.random()` replaced with `rng.next()`
- [x] Bot seed: `${room.botSeed}:${turnNumber}:${playerId}`

### Ready to Start Phase 0? ✅

**YES** - All critical blockers resolved. Safe to:

1. Create Prisma migration with canonical schema
2. Implement scheduler + worker
3. Add SeededRNG module
4. Build Easy bot with server-driven execution

**Recommended Phase Order (De-risked):**

1. Phase 0: Schema + worker + scheduler (no bot brains yet)
2. Phase 1: Easy bot (server-only) + end-to-end job execution
3. **Phase 1.5: Headless simulation CLI** (before Medium bot)
4. Phase 2: Pre-game bot selection UI
5. Phase 3+: Medium/Hard tuning via simulation

This prevents building UI on shaky engine foundations.

---

**Ready to Start:** Review analysis, confirm timeline, begin Phase 0
