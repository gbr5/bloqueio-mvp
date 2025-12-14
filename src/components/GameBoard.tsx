/**
 * GameBoard Component - Multiplayer Game Interface
 *
 * Wraps the game logic from game.tsx with multiplayer state management:
 * - Loads initial state from database
 * - Polls for updates from other players
 * - Syncs moves to database
 * - Handles turn validation
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadGameRoom, updateGameRoom } from "@/lib/actions/game-room";
import type { GameRoom, GameSnapshot } from "@/types/game";
import BloqueioPage from "@/app/game";

interface GameBoardProps {
  roomCode: string;
  initialRoom: GameRoom;
}

export function GameBoard({ roomCode, initialRoom }: GameBoardProps) {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameSnapshot>(
    initialRoom.game_state
  );

  // Get player ID from localStorage (set during join/create)
  // Using initializer function to avoid setState in useEffect
  const [myPlayerId] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const storedPlayerId = localStorage.getItem(`room_${roomCode}_playerId`);
    return storedPlayerId ? parseInt(storedPlayerId, 10) : null;
  });

  // Poll for game state updates every 2 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await loadGameRoom(roomCode);

        if (result.room) {
          // Update game state if changed
          const latestState = result.room.game_state;
          setGameState(latestState);

          // If game ended, could show game over screen
          if (latestState.winner !== null) {
            console.log("🏆 Winner detected:", latestState.winner);
          }

          // If room status changed (e.g., back to waiting), redirect
          if (result.room.status === "waiting") {
            router.push(`/room/${roomCode}/lobby`);
          }
        }
      } catch (error) {
        console.error("Failed to poll game state:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [roomCode, router]);

  // For now, just render the local game (Task 2)
  // Turn validation and move sync will be Task 4 & 5
  return (
    <div className="relative">
      {/* Player info header */}
      <div className="absolute top-4 left-4 bg-slate-800/90 border border-slate-700 rounded-lg p-4 z-10">
        <div className="text-white text-sm">
          <p className="font-semibold mb-2">Room: {roomCode}</p>
          {myPlayerId !== null && (
            <p className="text-slate-300">You are: Player {myPlayerId + 1}</p>
          )}
          <p className="text-slate-400 text-xs mt-1">
            Current Turn: Player {gameState.currentPlayerId + 1}
          </p>
        </div>
      </div>

      {/* Game board - currently just renders local game */}
      <BloqueioPage />

      {/* TODO: Task 4 - Add turn validation */}
      {/* TODO: Task 5 - Sync moves to database */}
      {/* TODO: Task 6 - Game over screen */}
    </div>
  );
}
