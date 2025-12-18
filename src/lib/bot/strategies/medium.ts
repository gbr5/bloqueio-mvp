/**
 * Medium Bot Strategy
 * Balanced bot: weighted move selection + basic defensive barriers
 * - Prefers moves that reduce distance to goal
 * - Places barriers to block opponent shortest paths
 * - Uses seeded RNG for determinism
 */

import type { GameSnapshot } from "../types";
import {
  findShortestPath,
  distanceToGoal,
  hasPathToGoal,
} from "../pathfinding";
import { SeededRNG } from "../rng";
import { GoalSide } from "@prisma/client";

export class MediumBot {
  constructor(private rng: SeededRNG) {}

  /**
   * Select move: Medium strategy uses weighted selection
   * Weights moves by how much they reduce distance to goal
   */
  async selectMove(
    gameState: GameSnapshot,
    playerId: number
  ): Promise<{
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

    // 30% chance to place a barrier instead of moving
    if (
      player.wallsLeft > 0 &&
      this.rng.next() < 0.3 &&
      gameState.players.length > 1
    ) {
      const barrier = await this.selectBarrier(gameState, playerId);
      if (barrier) {
        return {
          type: "BARRIER",
          row: barrier.row,
          col: barrier.col,
          orientation: barrier.orientation,
          reasoning: barrier.reasoning,
          candidatesEvaluated: barrier.candidatesEvaluated,
        };
      }
    }

    // Weighted move selection
    const weightedMoves = possibleMoves.map((move) => {
      const distanceAfter = distanceToGoal(
        move.row,
        move.col,
        player.goalSide as GoalSide
      );
      const currentDistance = distanceToGoal(
        player.row,
        player.col,
        player.goalSide as GoalSide
      );
      const improvement = currentDistance - distanceAfter;

      // Weight: positive for moves toward goal, negative for moves away
      // Add small random noise to avoid too-deterministic patterns
      const weight = improvement + this.rng.next() * 0.3;

      return { move, weight, improvement };
    });

    // Sort by weight descending
    weightedMoves.sort((a, b) => b.weight - a.weight);

    // Select from top 3 weighted moves (adds variety)
    const topMoves = weightedMoves.slice(0, Math.min(3, weightedMoves.length));
    const selected =
      topMoves[this.rng.nextInt(0, topMoves.length - 1)] || weightedMoves[0];

    return {
      type: "MOVE",
      row: selected.move.row,
      col: selected.move.col,
      reasoning: {
        strategy: "weighted_selection",
        improvement: selected.improvement,
        topCandidates: topMoves.length,
      },
      candidatesEvaluated: startCandidates,
    };
  }

  /**
   * Select barrier: Block opponent's shortest path
   */
  private async selectBarrier(
    gameState: GameSnapshot,
    playerId: number
  ): Promise<{
    row: number;
    col: number;
    orientation: string;
    reasoning?: unknown;
    candidatesEvaluated: number;
  } | null> {
    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player || player.wallsLeft === 0) return null;

    // Find closest opponent
    const opponents = gameState.players.filter((p) => p.playerId !== playerId);
    if (opponents.length === 0) return null;

    let closestOpponent = opponents[0];
    let minOpponentDistance = Infinity;

    for (const opp of opponents) {
      const distance = distanceToGoal(
        opp.row,
        opp.col,
        opp.goalSide as GoalSide
      );
      if (distance < minOpponentDistance) {
        minOpponentDistance = distance;
        closestOpponent = opp;
      }
    }

    // Get opponent's current path
    const opponentPath = findShortestPath(
      closestOpponent.row,
      closestOpponent.col,
      closestOpponent.goalSide as GoalSide,
      gameState.blockedEdges
    );

    if (!opponentPath.exists || opponentPath.path.length < 3) return null;

    // Try to place barrier along opponent's path (near them, not at goal)
    // Pick a cell 2-4 steps ahead on their path
    const targetIndex = Math.min(
      this.rng.nextInt(2, 4),
      opponentPath.path.length - 2
    );
    const targetCell = opponentPath.path[targetIndex];

    // Try both orientations at this location
    const barriers = [
      { row: targetCell.row, col: targetCell.col, orientation: "HORIZONTAL" },
      { row: targetCell.row, col: targetCell.col, orientation: "VERTICAL" },
    ];

    const validBarriers: Array<{
      row: number;
      col: number;
      orientation: string;
      pathLengthIncrease: number;
    }> = [];

    for (const barrier of barriers) {
      if (this.isBarrierValid(gameState, barrier)) {
        // Simulate placing barrier and check opponent's new path length
        const newBlockedEdges = new Set(gameState.blockedEdges);
        this.addBarrierEdges(newBlockedEdges, barrier);

        const newPath = findShortestPath(
          closestOpponent.row,
          closestOpponent.col,
          closestOpponent.goalSide as GoalSide,
          newBlockedEdges
        );

        if (newPath.exists) {
          const increase = newPath.distance - opponentPath.distance;
          if (increase > 0) {
            validBarriers.push({ ...barrier, pathLengthIncrease: increase });
          }
        }
      }
    }

    if (validBarriers.length === 0) return null;

    // Pick barrier that increases opponent path the most
    validBarriers.sort((a, b) => b.pathLengthIncrease - a.pathLengthIncrease);
    const best = validBarriers[0];

    return {
      row: best.row,
      col: best.col,
      orientation: best.orientation,
      reasoning: {
        strategy: "block_opponent",
        targetOpponent: closestOpponent.playerId,
        pathLengthIncrease: best.pathLengthIncrease,
      },
      candidatesEvaluated: barriers.length,
    };
  }

  /**
   * Check if barrier placement is valid
   */
  private isBarrierValid(
    gameState: GameSnapshot,
    barrier: { row: number; col: number; orientation: string }
  ): boolean {
    const GRID_SIZE = 11;
    const { row, col, orientation } = barrier;

    // Check bounds
    if (orientation === "HORIZONTAL") {
      if (row < 0 || row > GRID_SIZE - 2 || col < 0 || col > GRID_SIZE - 3) {
        return false;
      }
    } else {
      if (row < 0 || row > GRID_SIZE - 3 || col < 0 || col > GRID_SIZE - 2) {
        return false;
      }
    }

    // Check if edges already blocked
    const newEdges = this.getBarrierEdges(barrier);
    for (const edge of newEdges) {
      if (gameState.blockedEdges.has(edge)) return false;
    }

    // Check pathfinding: all players must still have path to goal
    const hypotheticalEdges = new Set(gameState.blockedEdges);
    this.addBarrierEdges(hypotheticalEdges, barrier);

    for (const player of gameState.players) {
      if (
        !hasPathToGoal(
          player.row,
          player.col,
          player.goalSide as GoalSide,
          hypotheticalEdges
        )
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get edges blocked by a barrier
   */
  private getBarrierEdges(barrier: {
    row: number;
    col: number;
    orientation: string;
  }): string[] {
    const edges: string[] = [];
    const { row, col, orientation } = barrier;

    if (orientation === "HORIZONTAL") {
      edges.push(this.normalizeEdgeKey(row, col, row + 1, col));
      edges.push(this.normalizeEdgeKey(row, col + 1, row + 1, col + 1));
    } else {
      edges.push(this.normalizeEdgeKey(row, col, row, col + 1));
      edges.push(this.normalizeEdgeKey(row + 1, col, row + 1, col + 1));
    }

    return edges;
  }

  /**
   * Add barrier edges to set
   */
  private addBarrierEdges(
    edges: Set<string>,
    barrier: { row: number; col: number; orientation: string }
  ): void {
    const newEdges = this.getBarrierEdges(barrier);
    newEdges.forEach((edge) => edges.add(edge));
  }

  /**
   * Get all valid moves for a player
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

    const INNER_SIZE = 9;

    for (const { dr, dc } of directions) {
      const newRow = player.row + dr;
      const newCol = player.col + dc;

      // Only allow movement within internal cells (1-9)
      if (
        newRow < 1 ||
        newRow > INNER_SIZE ||
        newCol < 1 ||
        newCol > INNER_SIZE
      ) {
        continue;
      }

      // Check if edge is blocked
      const edgeKey = this.normalizeEdgeKey(
        player.row,
        player.col,
        newRow,
        newCol
      );
      if (gameState.blockedEdges.has(edgeKey)) continue;

      // Check if occupied by another player
      if (
        gameState.players.some(
          (p) => p.playerId !== playerId && p.row === newRow && p.col === newCol
        )
      ) {
        continue;
      }

      moves.push({ row: newRow, col: newCol });
    }

    return moves;
  }

  /**
   * Normalize edge key for consistent lookup
   */
  private normalizeEdgeKey(
    r1: number,
    c1: number,
    r2: number,
    c2: number
  ): string {
    if (r1 > r2 || (r1 === r2 && c1 > c2)) {
      return `${r2},${c2}:${r1},${c1}`;
    }
    return `${r1},${c1}:${r2},${c2}`;
  }
}
