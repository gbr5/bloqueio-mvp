/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Bot Engine Orchestrator
 * Coordinates bot strategy selection and move execution
 * All bots go through here (Easy, Medium, Hard)
 */

import { db } from "@/lib/db";
import type { GameSnapshot, PlayerSnapshot } from "./types";
import { EasyBot } from "./strategies/easy";
import { MediumBot } from "./strategies/medium";
import { HardBot } from "./strategies/hard";
import { SeededRNG } from "./rng";
import { afterMoveCommit } from "./scheduler";

export class BotEngine {
  private rngSeed: string;

  constructor(botSeed: string) {
    this.rngSeed = botSeed;
  }

  /**
   * Execute bot move for a specific player
   * Creates transaction, executes move, increments turnNumber
   * Called ONLY from worker.ts (never from client)
   */
  async executeBotMove(roomCode: string, playerId: number): Promise<void> {
    // Load current state
    const room = await db.room.findUnique({
      where: { code: roomCode },
      include: { players: true, barriers: true },
    });

    if (!room) throw new Error(`Room not found: ${roomCode}`);

    // Build game snapshot
    const snapshot = this.dbToSnapshot(room);

    // Get bot strategy based on player type
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player)
      throw new Error(`Player ${playerId} not found in room ${roomCode}`);

    const difficulty = player.playerType.replace("BOT_", "");
    const bot = this.getBotStrategy(
      difficulty,
      room.botSeed || this.rngSeed,
      room.turnNumber,
      playerId
    );

    // Bot makes decision (with 5s timeout already enforced by worker)
    const startTime = Date.now();
    const decision = await bot.selectMove(snapshot, playerId);
    const computeTime = Date.now() - startTime;

    console.log(
      `🤖 Bot ${playerId} (${difficulty}): ${decision.type} at (${decision.row}, ${decision.col}) [${computeTime}ms]`
    );

    // Apply move to database (direct DB update, bypassing session checks)
    if (decision.type === "MOVE") {
      await this.applyBotMove(room.id, player.id, decision.row, decision.col);
    } else if (decision.type === "WALL") {
      await this.applyBotWall(
        room.id,
        player.id,
        decision.row,
        decision.col,
        decision.orientation as "HORIZONTAL" | "VERTICAL"
      );
    }

    // Log decision
    await db.botDecisionLog.create({
      data: {
        code: roomCode,
        playerId,
        turnNumber: room.turnNumber,
        difficulty,
        moveType: decision.type,
        decision: {
          row: decision.row,
          col: decision.col,
          orientation: decision.orientation,
        },
        reasoning: decision.reasoning as string,
        computeTimeMs: computeTime,
        candidatesEvaluated: decision.candidatesEvaluated || 0,
      },
    });

    // After bot move completes, check if next player is also a bot
    // This creates bot chains (bot → bot → bot until human turn)
    await afterMoveCommit(roomCode);
  }

  /**
   * Apply bot pawn move directly to DB
   * Similar to makeMove action but bypasses session validation
   */
  private async applyBotMove(
    roomId: string,
    playerId: string,
    toRow: number,
    toCol: number
  ): Promise<void> {
    const player = await db.player.findUnique({
      where: { id: playerId },
      include: { room: { include: { players: true } } },
    });

    if (!player) throw new Error(`Player ${playerId} not found`);

    const room = player.room;
    const isWin = this.checkWin(player.goalSide, toRow, toCol);

    // Execute transaction (same as makeMove but for bots)
    await db.$transaction([
      // Update player position
      db.player.update({
        where: { id: playerId },
        data: { row: toRow, col: toCol },
      }),

      // Record move in history
      db.move.create({
        data: {
          roomId: room.id,
          playerId: player.playerId,
          fromRow: player.row,
          fromCol: player.col,
          toRow,
          toCol,
        },
      }),

      // Update room state
      db.room.update({
        where: { id: room.id },
        data: {
          currentTurn: isWin
            ? room.currentTurn
            : this.getNextPlayerId(room.currentTurn, room.players),
          winner: isWin ? player.playerId : room.winner,
          status: isWin ? "FINISHED" : room.status,
          turnNumber: { increment: 1 }, // Increment for next turn
        },
      }),
    ]);
  }

  /**
   * Apply bot wall placement directly to DB
   */
  private async applyBotWall(
    roomId: string,
    playerId: string,
    row: number,
    col: number,
    orientation: "HORIZONTAL" | "VERTICAL"
  ): Promise<void> {
    const player = await db.player.findUnique({
      where: { id: playerId },
      include: { room: { include: { players: true } } },
    });

    if (!player) throw new Error(`Player ${playerId} not found`);

    const room = player.room;

    // Execute transaction (same as placeBarrier but for bots)
    await db.$transaction([
      db.barrier.create({
        data: {
          roomId: room.id,
          row,
          col,
          orientation,
          placedBy: player.playerId,
        },
      }),

      db.player.update({
        where: { id: playerId },
        data: { wallsLeft: player.wallsLeft - 1 },
      }),

      db.room.update({
        where: { id: room.id },
        data: {
          currentTurn: this.getNextPlayerId(room.currentTurn, room.players),
          turnNumber: { increment: 1 }, // Increment for next turn
        },
      }),
    ]);
  }

  /**
   * Check if position is winning position
   */
  private checkWin(goalSide: string, row: number, col: number): boolean {
    switch (goalSide) {
      case "TOP":
        return row === 0;
      case "RIGHT":
        return col === 10;
      case "BOTTOM":
        return row === 10;
      case "LEFT":
        return col === 0;
      default:
        return false;
    }
  }

  /**
   * Get next player ID
   */
  private getNextPlayerId(
    currentPlayerId: number,
    players: Array<{ playerId: number }>
  ): number {
    const currentIndex = players.findIndex(
      (p) => p.playerId === currentPlayerId
    );
    if (currentIndex === -1) return players[0].playerId;
    const nextIndex = (currentIndex + 1) % players.length;
    return players[nextIndex].playerId;
  }

  /**
   * Get bot strategy instance for difficulty level
   */
  private getBotStrategy(
    difficulty: string,
    seed: string,
    turnNumber: number,
    playerId: number
  ) {
    // Create deterministic seed: room.botSeed + turnNumber + playerId
    const fullSeed = `${seed}:${turnNumber}:${playerId}`;
    const rng = new SeededRNG(fullSeed);

    switch (difficulty.toUpperCase()) {
      case "EASY":
        return new EasyBot(rng);
      case "MEDIUM":
        return new MediumBot(rng);
      case "HARD":
        return new HardBot(rng);
      default:
        console.warn(`Unknown difficulty: ${difficulty}, defaulting to EASY`);
        return new EasyBot(rng);
    }
  }

  /**
   * Convert DB state to game snapshot
   */
  private dbToSnapshot(room: any): GameSnapshot {
    // Build blocked edges from barriers
    const blockedEdges = new Set<string>();
    const edgeKey = (r1: number, c1: number, r2: number, c2: number) => {
      if (r1 > r2 || (r1 === r2 && c1 > c2)) {
        [r1, r2] = [r2, r1];
        [c1, c2] = [c2, c1];
      }
      return `${r1},${c1}:${r2},${c2}`;
    };

    for (const b of room.barriers) {
      if (b.orientation === "HORIZONTAL") {
        blockedEdges.add(edgeKey(b.row, b.col, b.row + 1, b.col));
        blockedEdges.add(edgeKey(b.row, b.col + 1, b.row + 1, b.col + 1));
      } else {
        blockedEdges.add(edgeKey(b.row, b.col, b.row, b.col + 1));
        blockedEdges.add(edgeKey(b.row + 1, b.col, b.row + 1, b.col + 1));
      }
    }

    const players: PlayerSnapshot[] = room.players.map((p: any) => ({
      playerId: p.playerId,
      row: p.row,
      col: p.col,
      goalSide: p.goalSide,
      wallsLeft: p.wallsLeft,
      name: p.name,
      playerType: p.playerType,
    }));

    const barriers = room.barriers.map((b: any) => ({
      id: b.id,
      row: b.row,
      col: b.col,
      orientation: b.orientation,
      placedBy: b.placedBy,
    }));

    return {
      roomCode: room.code,
      turnNumber: room.turnNumber,
      currentTurn: room.currentTurn,
      players,
      blockedEdges,
      barriers,
      winner: room.winner,
      gameMode: room.gameMode,
    };
  }
}
