/**
 * Easy Bot Strategy
 * Simple bot: 60% random, 40% move toward goal
 * Uses seeded RNG for determinism
 */

import type { GameSnapshot, BotMove } from "../types";
import { findShortestPath, distanceToGoal } from "../pathfinding";
import { SeededRNG } from "../rng";

export class EasyBot {
  constructor(private rng: SeededRNG) {}

  /**
   * Select move: Easy strategy is mostly random with some goal bias
   */
  async selectMove(gameState: GameSnapshot, playerId: number): Promise<{
    type: string;
    row: number;
    col: number;
    orientation?: string;
    reasoning?: unknown;
    candidatesEvaluated: number;
  }> {
    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const possibleMoves = this.getAllValidMoves(gameState, player.playerId);
    const startCandidates = possibleMoves.length;

    // 60% random, 40% move toward goal
    if (this.rng.next() < 0.6) {
      const move = this.randomChoice(possibleMoves);
      return {
        type: "MOVE",
        row: move.row,
        col: move.col,
        reasoning: { strategy: "random" },
        candidatesEvaluated: startCandidates,
      };
    }

    // Move toward goal
    const path = findShortestPath(
      player.row,
      player.col,
      player.goalSide,
      gameState.blockedEdges
    );

    if (path.exists && path.path.length > 1) {
      const nextStep = path.path[1];
      return {
        type: "MOVE",
        row: nextStep.row,
        col: nextStep.col,
        reasoning: { strategy: "toward_goal", distance: path.distance },
        candidatesEvaluated: startCandidates,
      };
    }

    // Fallback to random
    const move = this.randomChoice(possibleMoves);
    return {
      type: "MOVE",
      row: move.row,
      col: move.col,
      reasoning: { strategy: "fallback_random" },
      candidatesEvaluated: startCandidates,
    };
  }

  /**
   * Get all valid moves for a player
   * Simple 4-directional movement (no jumping for now)
   */
  private getAllValidMoves(
    gameState: GameSnapshot,
    playerId: number
  ): Array<{ row: number; col: number }> {
    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player) return [];

    const moves: Array<{ row: number; col: number }> = [];
    const directions = [
      { dr: -1, dc: 0 }, // Up
      { dr: 1, dc: 0 }, // Down
      { dr: 0, dc: -1 }, // Left
      { dr: 0, dc: 1 }, // Right
    ];

    for (const { dr, dc } of directions) {
      const newRow = player.row + dr;
      const newCol = player.col + dc;

      // Check bounds
      if (newRow < 0 || newRow > 10 || newCol < 0 || newCol > 10) continue;

      // Check if edge is blocked
      const edgeKey = this.normalizeEdgeKey(player.row, player.col, newRow, newCol);
      if (gameState.blockedEdges.has(edgeKey)) continue;

      // Check if occupied by another player
      if (gameState.players.some((p) => p.playerId !== playerId && p.row === newRow && p.col === newCol)) {
        continue;
      }

      moves.push({ row: newRow, col: newCol });
    }

    return moves;
  }

  /**
   * Normalize edge key for consistent lookup
   */
  private normalizeEdgeKey(r1: number, c1: number, r2: number, c2: number): string {
    if (r1 > r2 || (r1 === r2 && c1 > c2)) {
      return `${r2},${c2}:${r1},${c1}`;
    }
    return `${r1},${c1}:${r2},${c2}`;
  }

  /**
   * Pick random element from array
   */
  private randomChoice<T>(array: T[]): T {
    return array[this.rng.nextInt(0, array.length - 1)];
  }
}
