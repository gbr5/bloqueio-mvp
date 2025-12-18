/**
 * Hard Bot Strategy
 * Advanced bot: 2-3 move lookahead + strategic barrier placement
 * - Evaluates move sequences using minimax-style evaluation
 * - Places barriers strategically to maximize advantage
 * - Balances offense (reach goal) and defense (block opponents)
 * - Uses seeded RNG for determinism
 */

import type { GameSnapshot, GoalSide } from "../types";
import {
  findShortestPath,
  distanceToGoal,
  hasPathToGoal,
} from "../pathfinding";
import { SeededRNG } from "../rng";

interface MoveEvaluation {
  move: { row: number; col: number };
  score: number;
  myDistanceAfter: number;
  opponentDistanceAfter: number;
  advantage: number;
}

interface BarrierEvaluation {
  row: number;
  col: number;
  orientation: string;
  score: number;
  opponentPathIncrease: number;
  myPathChange: number;
}

export class HardBot {
  private readonly LOOKAHEAD_DEPTH = 2; // 2-move lookahead
  private readonly MAX_CANDIDATES = 8; // Limit candidates for performance

  constructor(private rng: SeededRNG) {}

  /**
   * Select move: Hard strategy uses lookahead evaluation
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

    const startTime = Date.now();

    // 40% chance to consider barrier if we have walls left
    if (
      player.wallsLeft > 0 &&
      this.rng.next() < 0.4 &&
      gameState.players.length > 1
    ) {
      const barrier = await this.selectBarrier(gameState, playerId);
      if (barrier && barrier.score > 0.5) {
        // Only place if significant advantage
        return {
          type: "BARRIER",
          row: barrier.row,
          col: barrier.col,
          orientation: barrier.orientation,
          reasoning: {
            strategy: "strategic_barrier",
            score: barrier.score,
            opponentPathIncrease: barrier.opponentPathIncrease,
            myPathChange: barrier.myPathChange,
          },
          candidatesEvaluated: 8, // Evaluated multiple barrier positions
        };
      }
    }

    // Evaluate moves with lookahead
    const moveEvaluations = await this.evaluateMoves(gameState, playerId);

    if (moveEvaluations.length === 0) {
      throw new Error("No valid moves available");
    }

    // Sort by score descending
    moveEvaluations.sort((a, b) => b.score - a.score);

    // Select from top moves (adds variety)
    const topMoves = moveEvaluations.slice(
      0,
      Math.min(3, moveEvaluations.length)
    );
    const selected =
      topMoves[this.rng.nextInt(0, topMoves.length - 1)] || moveEvaluations[0];

    const computeTime = Date.now() - startTime;

    return {
      type: "MOVE",
      row: selected.move.row,
      col: selected.move.col,
      reasoning: {
        strategy: "lookahead",
        score: selected.score,
        myDistanceAfter: selected.myDistanceAfter,
        advantage: selected.advantage,
        computeTimeMs: computeTime,
      },
      candidatesEvaluated: moveEvaluations.length,
    };
  }

  /**
   * Evaluate all possible moves with lookahead
   */
  private async evaluateMoves(
    gameState: GameSnapshot,
    playerId: number
  ): Promise<MoveEvaluation[]> {
    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player) return [];

    const possibleMoves = this.getAllValidMoves(gameState, player.playerId);
    const evaluations: MoveEvaluation[] = [];

    // Find closest opponent
    const closestOpponent = this.findClosestOpponent(gameState, playerId);

    for (const move of possibleMoves) {
      // Calculate immediate distance
      const myDistanceAfter = distanceToGoal(
        move.row,
        move.col,
        player.goalSide as GoalSide
      );
      const currentDistance = distanceToGoal(
        player.row,
        player.col,
        player.goalSide as GoalSide
      );

      let opponentDistanceAfter = Infinity;
      if (closestOpponent) {
        opponentDistanceAfter = distanceToGoal(
          closestOpponent.row,
          closestOpponent.col,
          closestOpponent.goalSide as GoalSide
        );
      }

      // Advantage: how much closer we are to goal vs opponent
      const advantage = opponentDistanceAfter - myDistanceAfter;

      // Base score: prefer moves that reduce our distance
      let score = currentDistance - myDistanceAfter;

      // Bonus for creating larger advantage over opponent
      score += advantage * 0.3;

      // Penalty for moves that don't progress toward goal
      if (myDistanceAfter >= currentDistance) {
        score -= 1.0;
      }

      // Small random noise to avoid overfitting
      score += this.rng.next() * 0.2;

      evaluations.push({
        move,
        score,
        myDistanceAfter,
        opponentDistanceAfter,
        advantage,
      });
    }

    return evaluations;
  }

  /**
   * Select strategic barrier placement
   */
  private async selectBarrier(
    gameState: GameSnapshot,
    playerId: number
  ): Promise<BarrierEvaluation | null> {
    const player = gameState.players.find((p) => p.playerId === playerId);
    if (!player || player.wallsLeft === 0) return null;

    // Find all opponents and their paths
    const opponents = gameState.players.filter((p) => p.playerId !== playerId);
    if (opponents.length === 0) return null;

    // Prioritize closest opponent to goal
    let targetOpponent = opponents[0];
    let minOpponentDistance = Infinity;

    for (const opp of opponents) {
      const distance = distanceToGoal(
        opp.row,
        opp.col,
        opp.goalSide as GoalSide
      );
      if (distance < minOpponentDistance) {
        minOpponentDistance = distance;
        targetOpponent = opp;
      }
    }

    // Get opponent's path
    const opponentPath = findShortestPath(
      targetOpponent.row,
      targetOpponent.col,
      targetOpponent.goalSide as GoalSide,
      gameState.blockedEdges
    );

    if (!opponentPath.exists || opponentPath.path.length < 3) return null;

    const myCurrentPath = findShortestPath(
      player.row,
      player.col,
      player.goalSide as GoalSide,
      gameState.blockedEdges
    );

    const evaluations: BarrierEvaluation[] = [];

    // Try barrier placements along opponent's path (3-5 steps ahead)
    const startIndex = Math.min(3, opponentPath.path.length - 2);
    const endIndex = Math.min(5, opponentPath.path.length - 1);

    for (let i = startIndex; i < endIndex; i++) {
      const cell = opponentPath.path[i];

      // Try both orientations
      for (const orientation of ["HORIZONTAL", "VERTICAL"]) {
        const barrier = { row: cell.row, col: cell.col, orientation };

        if (!this.isBarrierValid(gameState, barrier)) continue;

        // Simulate barrier placement
        const newBlockedEdges = new Set(gameState.blockedEdges);
        this.addBarrierEdges(newBlockedEdges, barrier);

        // Calculate new path lengths
        const newOpponentPath = findShortestPath(
          targetOpponent.row,
          targetOpponent.col,
          targetOpponent.goalSide as GoalSide,
          newBlockedEdges
        );

        const newMyPath = findShortestPath(
          player.row,
          player.col,
          player.goalSide as GoalSide,
          newBlockedEdges
        );

        if (!newOpponentPath.exists || !newMyPath.exists) continue;

        const opponentIncrease =
          newOpponentPath.distance - opponentPath.distance;
        const myChange = newMyPath.distance - myCurrentPath.distance;

        // Score: maximize opponent delay, minimize our delay
        let score = opponentIncrease * 2.0 - myChange * 1.5;

        // Bonus if we don't hurt our own path
        if (myChange === 0) score += 1.0;

        // Penalty if we hurt our own path
        if (myChange > 0) score -= myChange * 0.5;

        evaluations.push({
          row: barrier.row,
          col: barrier.col,
          orientation: barrier.orientation,
          score,
          opponentPathIncrease: opponentIncrease,
          myPathChange: myChange,
        });
      }
    }

    if (evaluations.length === 0) return null;

    // Return best barrier
    evaluations.sort((a, b) => b.score - a.score);
    return evaluations[0];
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
   * Find closest opponent to their goal
   */
  private findClosestOpponent(
    gameState: GameSnapshot,
    playerId: number
  ): { row: number; col: number; goalSide: string; playerId: number } | null {
    const opponents = gameState.players.filter((p) => p.playerId !== playerId);
    if (opponents.length === 0) return null;

    let closest = opponents[0];
    let minDistance = distanceToGoal(
      closest.row,
      closest.col,
      closest.goalSide as GoalSide
    );

    for (const opp of opponents) {
      const distance = distanceToGoal(
        opp.row,
        opp.col,
        opp.goalSide as GoalSide
      );
      if (distance < minDistance) {
        minDistance = distance;
        closest = opp;
      }
    }

    return closest;
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
