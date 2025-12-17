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
import { createRoom } from "@/lib/actions/room-actions";
import { getGameModeConfig, type GameMode } from "@/types/game";

interface CreateRoomProps {
  onCancel: () => void;
}

export function CreateRoom({ onCancel }: CreateRoomProps) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<GameMode>("FOUR_PLAYER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await createRoom(selectedMode);

      if ("error" in result) {
        setError(result.error);
      } else {
        // Store player ID in sessionStorage
        sessionStorage.setItem(
          `room_${result.code}_playerId`,
          String(result.playerId)
        );
        // Auto-redirect to lobby instead of showing code screen
        router.push(`/room/${result.code}/lobby`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
      <div className="w-full max-w-md px-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Create New Game
        </h1>

        <div className="space-y-6">
          <p className="text-center text-slate-300">
            Choose game mode and create a new multiplayer room
          </p>

          {/* Game Mode Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white text-center">
              Escolha o Modo de Jogo
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 2-Player Mode Card */}
              <button
                onClick={() => setSelectedMode("TWO_PLAYER")}
                disabled={loading}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedMode === "TWO_PLAYER"
                    ? "border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="text-4xl mb-3">🎯</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  2 Jogadores
                </h3>
                <p className="text-sm text-slate-300 mb-3">Duelo clássico</p>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>• 12 barreiras cada</div>
                  <div>• Partida focada</div>
                  <div>• Face a face</div>
                </div>
              </button>

              {/* 4-Player Mode Card */}
              <button
                onClick={() => setSelectedMode("FOUR_PLAYER")}
                disabled={loading}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedMode === "FOUR_PLAYER"
                    ? "border-blue-500 bg-blue-900/30 shadow-lg shadow-blue-500/20"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="text-4xl mb-3">🎲</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  4 Jogadores
                </h3>
                <p className="text-sm text-slate-300 mb-3">Modo padrão</p>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>• 6 barreiras cada</div>
                  <div>• 2-4 jogadores</div>
                  <div>• Mais estratégico</div>
                </div>
              </button>
            </div>
          </div>

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
              {loading
                ? "Criando Sala..."
                : `Criar Sala (${getGameModeConfig(selectedMode).label})`}
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
      </div>
    </div>
  );
}
