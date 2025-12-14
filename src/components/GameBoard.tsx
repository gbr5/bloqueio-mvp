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

          // If game ended, show winner
          if (latestState.winner !== null) {
            console.log("🏆 Winner detected:", latestState.winner);
            // TODO: Show game over modal
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

  // Sync moves to database (Task 5)
  const handleGameStateChange = async (newState: GameSnapshot) => {
    // Optimistic update
    setGameState(newState);

    // Sync to database
    try {
      const result = await updateGameRoom(roomCode, newState);
      if (result.error) {
        console.error("Failed to sync game state:", result.error);
        // Could rollback here but keeping it simple for MVP
      }
    } catch (error) {
      console.error("Failed to sync game state:", error);
    }
  };

  // For now, just render the local game (Task 2)
  // Turn validation and move sync will be Task 4 & 5
  const isMyTurn = myPlayerId !== null && gameState.currentPlayerId === myPlayerId;

  return (
    <div className="relative">
      {/* Player info header */}
      <div className="absolute top-4 left-4 bg-slate-800/90 border border-slate-700 rounded-lg p-4 z-10">
        <div className="text-white text-sm space-y-2">
          <p className="font-semibold">Room: {roomCode}</p>
          {myPlayerId !== null && (
            <p className="text-slate-300">You are: Player {myPlayerId + 1}</p>
          )}
          <div className="border-t border-slate-600 pt-2">
            <p className="text-slate-400 text-xs">
              Current Turn: Player {gameState.currentPlayerId + 1}
            </p>
            {isMyTurn ? (
              <p className="text-green-400 font-semibold text-xs mt-1">
                ✓ Your turn!
              </p>
            ) : (
              <p className="text-yellow-400 text-xs mt-1">
                Waiting for opponent...
              </p>
            )}
          </div>
          {gameState.winner !== null && (
            <div className="border-t border-slate-600 pt-2">
              <p className="text-yellow-400 font-bold">
                🏆 Player {gameState.winner + 1} wins!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Multiplayer notice */}
      {!isMyTurn && gameState.winner === null && (
        <div className="absolute top-4 right-4 bg-yellow-900/90 border border-yellow-600 rounded-lg p-3 z-10">
          <p className="text-yellow-200 text-sm">
            ⚠️ Not your turn - moves won't sync
          </p>
        </div>
      )}

      {/* Game board - currently local only */}
      <BloqueioPage />

      {/* Note: Game is local-only for now */}
      {/* TODO: Make BloqueioPage controlled to sync moves */}
      {/* TODO: Add proper game over modal */}
    </div>
  );
}
