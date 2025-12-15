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
  const [showGameOver, setShowGameOver] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);

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
          if (latestState.winner !== null && !showGameOver) {
            console.log("🏆 Winner detected:", latestState.winner);
            setShowGameOver(true);
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
  }, [roomCode, router, showGameOver]);

  // Sync moves to database
  // Called when the controlled BloqueioPage makes a move
  const handleGameStateChange = async (newState: GameSnapshot) => {
    // Optimistic update - update UI immediately for better UX
    setGameState(newState);

    // Sync to database - other players will see this on their next poll
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

  // Play Again - reset game and return to lobby
  const handlePlayAgain = async () => {
    setIsRestarting(true);

    try {
      // Create fresh initial game state with all current players
      const resetState: GameSnapshot = {
        players: initialRoom.game_state.players.map((p) => ({
          ...p,
          row: p.id === 0 ? 5 : p.id === 1 ? 5 : p.id === 2 ? 5 : 5,
          col: p.id === 0 ? 0 : p.id === 1 ? 10 : p.id === 2 ? 5 : 5,
          wallsLeft: 6,
        })),
        blockedEdges: [],
        barriers: [],
        currentPlayerId: 0,
        winner: null,
      };

      // Update room status back to waiting
      const result = await updateGameRoom(roomCode, resetState, "waiting");

      if (result.error) {
        console.error("Failed to reset game:", result.error);
        alert("Failed to reset game. Please try again.");
        setIsRestarting(false);
        return;
      }

      // Hide modal and navigate back to lobby
      setShowGameOver(false);
      router.push(`/room/${roomCode}/lobby`);
    } catch (error) {
      console.error("Failed to reset game:", error);
      alert("Failed to reset game. Please try again.");
      setIsRestarting(false);
    }
  };

  const handleGoHome = () => {
    // Clear localStorage
    localStorage.removeItem(`room_${roomCode}_playerId`);
    localStorage.removeItem(`room_${roomCode}_nickname`);

    // Navigate home
    router.push("/");
  };

  const handleLeaveGame = () => {
    if (confirm("Are you sure you want to leave the game?")) {
      handleGoHome();
    }
  };

  // For now, just render the local game (Task 2)
  // Turn validation and move sync will be Task 4 & 5
  const isMyTurn =
    myPlayerId !== null && gameState.currentPlayerId === myPlayerId;

  return (
    <div className="relative">
      {/* Leave Game Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleLeaveGame}
          className="px-4 py-2 bg-red-900/90 hover:bg-red-800 border border-red-600 text-red-200 rounded-lg transition-colors text-sm font-semibold"
        >
          ← Leave Game
        </button>
      </div>

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

      {/* Game board - now controlled for multiplayer sync */}
      <BloqueioPage
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
        myPlayerId={myPlayerId}
        disabled={!isMyTurn || gameState.winner !== null}
      />

      {/* Game Over Modal */}
      {showGameOver && gameState.winner !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              {/* Winner Announcement */}
              <div className="space-y-2">
                <div className="text-6xl">🏆</div>
                <h2 className="text-3xl font-bold text-yellow-400">
                  Game Over!
                </h2>
                <p className="text-2xl text-white">
                  {myPlayerId === gameState.winner
                    ? "You Win!"
                    : `Player ${gameState.winner + 1} Wins!`}
                </p>
              </div>

              {/* Player Stats */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">
                  Final Standings
                </h3>
                <div className="space-y-2">
                  {gameState.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-2 rounded ${
                        player.id === gameState.winner
                          ? "bg-yellow-900/30 border border-yellow-600"
                          : "bg-slate-800/30"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-white text-sm flex-1">
                        {player.name}
                      </span>
                      {player.id === gameState.winner && (
                        <span className="text-yellow-400 text-lg">👑</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handlePlayAgain}
                  disabled={isRestarting}
                  className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg flex items-center justify-center gap-2"
                >
                  {isRestarting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      <span>Restarting...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>Play Again</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleGoHome}
                  disabled={isRestarting}
                  className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors duration-200"
                >
                  🏠 Back to Home
                </button>
              </div>

              <p className="text-xs text-slate-500">
                All players will return to the lobby when you click Play Again
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
