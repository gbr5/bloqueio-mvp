/**
 * CreateRoom Component
 *
 * Handles room creation flow:
 * 1. Creates room in database
 * 2. Displays generated room code
 * 3. Allows host to copy code and share
 * 4. Navigates to waiting lobby
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGameRoom } from "@/lib/actions/game-room";
import type { GameSnapshot } from "@/types/game";

// Helper to create initial game state with host player
function createInitialGameState(): GameSnapshot {
  // Create the host player (Player 1 - Red)
  const hostPlayer = {
    id: 0 as const,
    row: 5,
    col: 0,
    goalSide: "RIGHT" as const,
    wallsLeft: 6,
    color: "#ef4444",
    label: "P1",
    name: "Player 1 (You)",
  };

  return {
    players: [hostPlayer],
    blockedEdges: [],
    barriers: [],
    currentPlayerId: 0,
    winner: null,
  };
}

interface CreateRoomProps {
  onCancel: () => void;
}

export function CreateRoom({ onCancel }: CreateRoomProps) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);

    try {
      const initialState = createInitialGameState();
      const result = await createGameRoom(initialState);
      console.log("🚪 [CreateRoom] createGameRoom result:", result);

      if (result.error) {
        setError(result.error);
      } else if (result.roomCode) {
        setRoomCode(result.roomCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;

    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleContinue = () => {
    if (roomCode) {
      // Store player ID in localStorage (host is always player 0)
      localStorage.setItem(`room_${roomCode}_playerId`, "0");

      // Navigate to lobby with isHost=true query param
      router.push(`/room/${roomCode}/lobby?isHost=true`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
      <div className="w-full max-w-md px-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Create New Game
        </h1>

        {!roomCode ? (
          /* Step 1: Create room */
          <div className="space-y-6">
            <p className="text-center text-slate-300">
              Create a new multiplayer game room and invite your friends!
            </p>

            {error && (
              <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
              >
                {loading ? "Creating Room..." : "Create Room"}
              </button>

              <button
                onClick={onCancel}
                disabled={loading}
                className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Show room code */
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-slate-300 mb-4">Your room code is:</p>
              <div className="bg-slate-800 border-2 border-blue-500 rounded-lg p-6 mb-4">
                <p className="text-5xl font-mono font-bold text-blue-400 tracking-widest">
                  {roomCode}
                </p>
              </div>
              <p className="text-sm text-slate-400">
                Share this code with your friends to let them join
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCopyCode}
                className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <span>✓</span>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <span>📋</span>
                    <span>Copy Code</span>
                  </>
                )}
              </button>

              <button
                onClick={handleContinue}
                className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
              >
                Continue to Lobby
              </button>

              <button
                onClick={onCancel}
                className="w-full py-2 px-6 text-slate-400 hover:text-white transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
