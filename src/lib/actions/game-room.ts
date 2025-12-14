"use server";

/**
 * Server Actions for Game Room Operations
 *
 * These run on the server and can safely use database connections.
 * Client components call these actions via POST requests.
 */

import type { GameSnapshot, GameRoom } from "@/types/game";
import { sql } from "@/lib/db";

/**
 * Generate a random 6-character room code (uppercase letters and numbers)
 */
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new game room
 */
export async function createGameRoom(
  initialState: GameSnapshot
): Promise<{ roomCode?: string; error?: string }> {
  console.log("🎮 [Server Action] createGameRoom called");
  console.log("📊 Initial state:", JSON.stringify(initialState, null, 2));

  try {
    const roomCode = generateRoomCode();
    console.log("🔑 Generated room code:", roomCode);

    const result = await sql`
      INSERT INTO game_rooms (id, status, host_player_id, current_player_id, game_state)
      VALUES (
        ${roomCode}, 
        'waiting', 
        0, 
        ${initialState.currentPlayerId}, 
        ${JSON.stringify(initialState)}
      )
      RETURNING id
    `;

    console.log("✅ Room created successfully:", result);
    return { roomCode };
  } catch (error) {
    console.error("❌ Failed to create room:", error);
    return { error: "Failed to create room" };
  }
}

/**
 * Load a game room by code
 */
export async function loadGameRoom(
  roomCode: string
): Promise<{ room?: GameRoom; error?: string }> {
  try {
    const result = await sql<GameRoom[]>`
      SELECT * FROM game_rooms
      WHERE id = ${roomCode}
      LIMIT 1
    `;

    if (result.length === 0) {
      return { error: "Room not found" };
    }

    return { room: result[0] as GameRoom };
  } catch (error) {
    console.error("Failed to load room:", error);
    return { error: "Failed to load room" };
  }
}

/**
 * Update game room state
 */
export async function updateGameRoom(
  roomCode: string,
  gameState: GameSnapshot,
  status?: "waiting" | "playing" | "finished"
): Promise<{ success?: boolean; error?: string }> {
  try {
    await sql`
      UPDATE game_rooms
      SET 
        game_state = ${JSON.stringify(gameState)},
        current_player_id = ${gameState.currentPlayerId},
        status = COALESCE(${status}, status)
      WHERE id = ${roomCode}
    `;

    return { success: true };
  } catch (error) {
    console.error("Failed to update room:", error);
    return { error: "Failed to update room" };
  }
}
