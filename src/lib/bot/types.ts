/**
 * Bot System Types
 * Canonical type definitions for all bot-related functionality
 */

export type BotDifficulty = "EASY" | "MEDIUM" | "HARD";
export type PlayerType = "HUMAN" | "BOT_EASY" | "BOT_MEDIUM" | "BOT_HARD";
export type GoalSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

/**
 * Game snapshot for bot decision-making
 * Represents complete board state needed by bot engine
 */
export interface GameSnapshot {
  roomCode: string;
  turnNumber: number;
  currentTurn: number; // Player ID 0-3
  players: PlayerSnapshot[];
  blockedEdges: Set<string>; // Edge keys that are blocked by barriers
  barriers: BarrierSnapshot[];
  winner: number | null;
  gameMode: "TWO_PLAYER" | "FOUR_PLAYER";
}

export interface PlayerSnapshot {
  playerId: number; // 0-3
  row: number;
  col: number;
  goalSide: GoalSide;
  wallsLeft: number;
  name: string;
  playerType: PlayerType;
}

export interface BarrierSnapshot {
  id: string;
  row: number;
  col: number;
  orientation: "HORIZONTAL" | "VERTICAL";
  placedBy: number; // Player ID who placed it
}

/**
 * Move decision made by bot
 */
export interface BotMove {
  type: "MOVE" | "WALL";
  row: number;
  col: number;
  orientation?: "HORIZONTAL" | "VERTICAL"; // For walls
}

/**
 * Bot decision metadata for logging
 */
export interface BotDecision {
  move: BotMove;
  reasoning?: unknown; // Algorithm-specific reasoning (minimax scores, etc.)
  computeTimeMs: number;
  candidatesEvaluated: number;
}

/**
 * Path result from pathfinding algorithms
 */
export interface PathResult {
  distance: number;
  path: Array<{ row: number; col: number }>;
  exists: boolean;
}

/**
 * Wall candidate for placement
 */
export interface WallCandidate {
  row: number;
  col: number;
  orientation: "HORIZONTAL" | "VERTICAL";
  score?: number; // Optional scoring for evaluation
}
