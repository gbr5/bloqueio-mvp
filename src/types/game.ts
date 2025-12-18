/**
 * Bloqueio Game Type Definitions
 *
 * This file contains all TypeScript type definitions for the game.
 * Extracted from the monolithic page.tsx for better maintainability.
 */

// ============================================================================
// Core Game Types
// ============================================================================

/** Player ID - 4 players numbered 0-3 */
export type PlayerId = 0 | 1 | 2 | 3;

/** Goal sides - which border edge each player must reach to win */
export type GoalSide = "TOP" | "RIGHT" | "BOTTOM" | "LEFT";

/** Game mode - 2-player or 4-player */
export type GameMode = "TWO_PLAYER" | "FOUR_PLAYER";

/** Game mode - either moving pawns or placing barriers */
export type Mode = "move" | "wall";

/** Barrier orientation - horizontal or vertical */
export type Orientation = "H" | "V";

// ============================================================================
// Player
// ============================================================================

export interface Player {
  /** Player identifier (0-3) */
  id: PlayerId;
  /** Current row position on board (0-10) */
  row: number;
  /** Current column position on board (0-10) */
  col: number;
  /** Which border side this player must reach to win */
  goalSide: GoalSide;
  /** Number of barriers remaining (starts at 6) */
  wallsLeft: number;
  /** Player color (CSS color string) */
  color: string;
  /** Display label (e.g., "P1", "P2") */
  label: string;
  /** Player name */
  name: string;
  /** Player type (HUMAN or bot difficulty) - optional for backwards compatibility */
  playerType?: "HUMAN" | "BOT_EASY" | "BOT_MEDIUM" | "BOT_HARD";
}

// ============================================================================
// Board & Movement
// ============================================================================

/** A cell position on the board */
export interface Cell {
  row: number;
  col: number;
}

// ============================================================================
// Barriers/Walls
// ============================================================================

export interface Barrier {
  /** Base row (top-left of 2x2 area) */
  row: number;
  /** Base column (top-left of 2x2 area) */
  col: number;
  /** Orientation: Horizontal or Vertical */
  orientation: Orientation;
  /** Unique identifier for this barrier */
  id: string;
  /** Player ID who placed this barrier (optional for backwards compatibility) */
  placedBy?: PlayerId;
}

// ============================================================================
// Game State
// ============================================================================

export interface GameSnapshot {
  /** All players and their current positions (2 or 4 depending on mode) */
  players: Player[];
  /** Set of blocked edges between cells (serialized as strings) */
  blockedEdges: string[];
  /** All placed barriers on the board */
  barriers: Barrier[];
  /** ID of player whose turn it currently is */
  currentPlayerId: PlayerId;
  /** ID of winning player, or null if game is ongoing */
  winner: PlayerId | null;
  /** Game mode - 2 or 4 players */
  gameMode?: GameMode;
}

// ============================================================================
// Database Types (for multiplayer)
// ============================================================================

/** Game room status */
export type RoomStatus = "waiting" | "playing" | "finished";

export interface GameRoom {
  /** 6-digit room code */
  id: string;
  /** Current room status */
  status: RoomStatus;
  /** Player ID of the room host */
  host_player_id: number;
  /** Player ID whose turn it currently is */
  current_player_id: number;
  /** Serialized game state (stored as JSONB) */
  game_state: GameSnapshot;
  /** Room creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Game mode configuration */
export const GAME_MODE_CONFIG = {
  TWO_PLAYER: {
    maxPlayers: 2,
    wallsPerPlayer: 12,
    minPlayers: 2,
    playerSlots: [0, 2] as const, // Top and Bottom positions only
    label: "2 Jogadores",
    description: "Duelo clássico - 12 barreiras cada",
  },
  FOUR_PLAYER: {
    maxPlayers: 4,
    wallsPerPlayer: 6,
    minPlayers: 2,
    playerSlots: [0, 1, 2, 3] as const, // All positions
    label: "4 Jogadores",
    description: "Modo padrão - 6 barreiras cada",
  },
} as const;

/** Player base colors (semi-transparent for board overlay) */
export const PLAYER_BASE_COLORS: Record<PlayerId, string> = {
  0: "rgba(239,68,68,0.24)", // red
  1: "rgba(59,130,246,0.24)", // blue
  2: "rgba(34,197,94,0.24)", // green
  3: "rgba(245,158,11,0.24)", // yellow
};

/** Player solid colors */
export const PLAYER_COLORS: Record<PlayerId, string> = {
  0: "#ef4444", // red
  1: "#3b82f6", // blue
  2: "#22c55e", // green
  3: "#f59e0b", // yellow
};

/** Player labels */
export const PLAYER_LABELS: Record<PlayerId, string> = {
  0: "P1",
  1: "P2",
  2: "P3",
  3: "P4",
};

// ============================================================================
// Utility Types
// ============================================================================

/** Type guard to check if a number is a valid PlayerId */
export function isPlayerId(id: number): id is PlayerId {
  return id >= 0 && id <= 3;
}

/** Type guard to check if a value is a valid Orientation */
export function isOrientation(value: string): value is Orientation {
  return value === "H" || value === "V";
}

/** Type guard to check if a value is a valid GameMode */
export function isGameMode(value: string): value is GameMode {
  return value === "TWO_PLAYER" || value === "FOUR_PLAYER";
}

/** Helper to safely access GAME_MODE_CONFIG */
export function getGameModeConfig(mode: GameMode) {
  return GAME_MODE_CONFIG[mode];
}
