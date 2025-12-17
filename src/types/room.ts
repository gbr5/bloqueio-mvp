/**
 * Room-related type definitions
 */

import type { Room, Player, Barrier } from "@prisma/client";

/**
 * Room with full relations loaded
 */
export type RoomWithPlayers = Room & {
  players: Player[];
  barriers: Barrier[];
};
