"use server";

/**
 * Server Actions for Game Room Operations
 *
 * These run on the server and can safely use database connections.
 * Client components call these actions via POST requests.
 */

import type { GameSnapshot, GameRoom, PlayerId } from "@/types/game";
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

    const row = result[0];

    // Parse game_state if it's a JSON string (from database JSONB)
    const gameState =
      typeof row.game_state === "string"
        ? JSON.parse(row.game_state)
        : row.game_state;

    const room: GameRoom = {
      id: row.id,
      status: row.status,
      host_player_id: row.host_player_id,
      current_player_id: row.current_player_id,
      game_state: gameState,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };

    console.log(
      "📦 [loadGameRoom] Loaded room:",
      room.id,
      "with",
      room.game_state.players.length,
      "players"
    );

    return { room };
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
    if (status) {
      // Update with status change
      await sql`
        UPDATE game_rooms
        SET 
          game_state = ${JSON.stringify(gameState)},
          current_player_id = ${gameState.currentPlayerId},
          status = ${status}
        WHERE id = ${roomCode}
      `;
    } else {
      // Update without changing status
      await sql`
        UPDATE game_rooms
        SET 
          game_state = ${JSON.stringify(gameState)},
          current_player_id = ${gameState.currentPlayerId}
        WHERE id = ${roomCode}
      `;
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update room:", error);
    return { error: "Failed to update room" };
  }
}

/**
 * Join a game room (add player to the room)
 */
export async function joinGameRoom(
  roomCode: string,
  playerName?: string
): Promise<{ success?: boolean; playerId?: number; error?: string }> {
  try {
    console.log("🚪 [joinGameRoom] Attempting to join room:", roomCode);

    // Load current room state
    const result = await loadGameRoom(roomCode);

    if (result.error || !result.room) {
      console.error("❌ [joinGameRoom] Room not found:", roomCode);
      return { error: "Room not found" };
    }

    const room = result.room;
    console.log(
      "📊 [joinGameRoom] Current players:",
      room.game_state.players.length
    );

    // Check if room is full
    if (room.game_state.players.length >= 4) {
      return { error: "Room is full" };
    }

    // Check if game already started
    if (room.status === "playing" || room.status === "finished") {
      return { error: "Game already started" };
    }

    // Determine next player ID and position
    const existingPlayerIds = room.game_state.players.map((p) => p.id);
    const nextPlayerId = [0, 1, 2, 3].find(
      (id) => !existingPlayerIds.includes(id as PlayerId)
    ) as 0 | 1 | 2 | 3 | undefined;

    if (nextPlayerId === undefined) {
      return { error: "Room is full" };
    }

    // Player configurations based on ID
    const playerConfigs = {
      0: {
        row: 5,
        col: 0,
        goalSide: "RIGHT" as const,
        color: "#ef4444",
        label: "P1",
      },
      1: {
        row: 0,
        col: 5,
        goalSide: "BOTTOM" as const,
        color: "#3b82f6",
        label: "P2",
      },
      2: {
        row: 5,
        col: 10,
        goalSide: "LEFT" as const,
        color: "#22c55e",
        label: "P3",
      },
      3: {
        row: 10,
        col: 5,
        goalSide: "TOP" as const,
        color: "#f59e0b",
        label: "P4",
      },
    };

    const config = playerConfigs[nextPlayerId];
    const newPlayer = {
      id: nextPlayerId,
      row: config.row,
      col: config.col,
      goalSide: config.goalSide,
      wallsLeft: 6,
      color: config.color,
      label: config.label,
      name: playerName || `Player ${nextPlayerId + 1}`,
    };

    // Add player to game state
    const updatedGameState = {
      ...room.game_state,
      players: [...room.game_state.players, newPlayer],
    };

    console.log(
      "👥 [joinGameRoom] Updated players:",
      updatedGameState.players.length
    );
    console.log("🔄 [joinGameRoom] Updating room:", roomCode);

    // Update room in database
    const updateResult = await updateGameRoom(roomCode, updatedGameState);

    if (updateResult.error) {
      console.error("❌ [joinGameRoom] Failed to update:", updateResult.error);
      return { error: updateResult.error };
    }

    console.log(
      "✅ [joinGameRoom] Player",
      nextPlayerId,
      "joined room",
      roomCode,
      "- Total players:",
      updatedGameState.players.length
    );

    return { success: true, playerId: nextPlayerId };
  } catch (error) {
    console.error("Failed to join room:", error);
    return { error: "Failed to join room" };
  }
}

/**
 * Start a game (change room status to 'playing')
 */
export async function startGame(
  roomCode: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    // Load current room to get game state
    const result = await loadGameRoom(roomCode);

    if (result.error || !result.room) {
      return { error: "Room not found" };
    }

    const room = result.room;

    // Validate can start
    if (room.game_state.players.length < 2) {
      return { error: "Need at least 2 players to start" };
    }

    if (room.status === "playing" || room.status === "finished") {
      return { error: "Game already started" };
    }

    // Update room status to 'playing'
    const updateResult = await updateGameRoom(
      roomCode,
      room.game_state,
      "playing"
    );

    if (updateResult.error) {
      return { error: updateResult.error };
    }

    console.log("🎮 [startGame] Game started for room", roomCode);

    return { success: true };
  } catch (error) {
    console.error("Failed to start game:", error);
    return { error: "Failed to start game" };
  }
}
