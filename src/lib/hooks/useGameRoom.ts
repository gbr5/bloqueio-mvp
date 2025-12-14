/**
 * useGameRoom Hook
 *
 * Manages game room state with database persistence.
 * Provides functions to create, load, and update game rooms.
 *
 * Usage:
 *   const { room, loading, error, createRoom, loadRoom, updateRoom } = useGameRoom();
 *
 *   // Create new room
 *   const roomId = await createRoom(initialGameState);
 *
 *   // Load existing room
 *   await loadRoom('ABC123');
 *
 *   // Update room state
 *   await updateRoom('ABC123', newGameState);
 */

"use client";

import { useState, useCallback } from "react";
import type { GameRoom, GameSnapshot, RoomStatus } from "@/types/game";
import { sql } from "@/lib/db";

interface UseGameRoomReturn {
  room: GameRoom | null;
  loading: boolean;
  error: Error | null;
  createRoom: (initialState: GameSnapshot) => Promise<string>;
  loadRoom: (roomId: string) => Promise<GameRoom | null>;
  updateRoom: (roomId: string, state: GameSnapshot) => Promise<void>;
  clearError: () => void;
}

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

export function useGameRoom(): UseGameRoomReturn {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Create a new game room in the database
   * Returns the generated room code
   */
  const createRoom = useCallback(
    async (initialState: GameSnapshot): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const roomCode = generateRoomCode();
        const status: RoomStatus = "waiting";
        const hostPlayerId = initialState.currentPlayerId;

        // Insert into database
        await sql`
        INSERT INTO game_rooms (
          id,
          status,
          host_player_id,
          current_player_id,
          game_state
        ) VALUES (
          ${roomCode},
          ${status},
          ${hostPlayerId},
          ${initialState.currentPlayerId},
          ${JSON.stringify(initialState)}
        )
      `;

        // Load the created room
        await loadRoom(roomCode);

        return roomCode;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to create room");
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Load a game room from the database by room code
   * Returns the room or null if not found
   */
  const loadRoom = useCallback(
    async (roomId: string): Promise<GameRoom | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await sql`
        SELECT
          id,
          status,
          host_player_id,
          current_player_id,
          game_state,
          created_at,
          updated_at
        FROM game_rooms
        WHERE id = ${roomId}
        LIMIT 1
      `;

        if (result.length === 0) {
          setRoom(null);
          return null;
        }

        const row = result[0] as {
          id: string;
          status: RoomStatus;
          host_player_id: number;
          current_player_id: number;
          game_state: string | GameSnapshot;
          created_at: Date;
          updated_at: Date;
        };

        // Parse game_state if it's a string (from database)
        const gameState =
          typeof row.game_state === "string"
            ? JSON.parse(row.game_state)
            : row.game_state;

        const gameRoom: GameRoom = {
          id: row.id,
          status: row.status,
          hostPlayerId: row.host_player_id,
          currentPlayerId: row.current_player_id,
          gameState,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        setRoom(gameRoom);
        return gameRoom;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to load room");
        setError(error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update game room state in the database
   */
  const updateRoom = useCallback(
    async (roomId: string, state: GameSnapshot): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        // Determine status based on game state
        const status: RoomStatus =
          state.winner !== null ? "finished" : "playing";

        await sql`
        UPDATE game_rooms
        SET
          current_player_id = ${state.currentPlayerId},
          game_state = ${JSON.stringify(state)},
          status = ${status},
          updated_at = NOW()
        WHERE id = ${roomId}
      `;

        // Reload room to get updated data
        await loadRoom(roomId);
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Failed to update room");
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [loadRoom]
  );

  return {
    room,
    loading,
    error,
    createRoom,
    loadRoom,
    updateRoom,
    clearError,
  };
}
