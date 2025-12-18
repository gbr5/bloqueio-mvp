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

type PlayerSlotType =
  | "EMPTY"
  | "HUMAN"
  | "BOT_EASY"
  | "BOT_MEDIUM"
  | "BOT_HARD";

export function CreateRoom({ onCancel }: CreateRoomProps) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<GameMode>("FOUR_PLAYER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowBots, setAllowBots] = useState(false);
  const [playerSlots, setPlayerSlots] = useState<PlayerSlotType[]>([
    "HUMAN",
    "EMPTY",
    "EMPTY",
    "EMPTY",
  ]);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);

    try {
      const config = getGameModeConfig(selectedMode);
      const maxPlayers = config.maxPlayers;

      // Validate player count
      const filledSlots = playerSlots
        .slice(0, maxPlayers)
        .filter((s) => s !== "EMPTY");
      if (filledSlots.length < config.minPlayers) {
        setError(`Need at least ${config.minPlayers} players to start`);
        setLoading(false);
        return;
      }

      const result = await createRoom(
        selectedMode,
        allowBots ? playerSlots.slice(0, maxPlayers) : undefined
      );

      if ("error" in result) {
        setError(result.error);
      } else {
        // Store player ID in sessionStorage
        sessionStorage.setItem(
          `room_${result.code}_playerId`,
          String(result.playerId)
        );
        // Auto-redirect to lobby
        router.push(`/room/${result.code}/lobby`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const updatePlayerSlot = (index: number, type: PlayerSlotType) => {
    const newSlots = [...playerSlots];
    newSlots[index] = type;
    setPlayerSlots(newSlots);
  };

  const getSlotLabel = (type: PlayerSlotType): string => {
    switch (type) {
      case "EMPTY":
        return "Empty";
      case "HUMAN":
        return "Human";
      case "BOT_EASY":
        return "Bot (Easy)";
      case "BOT_MEDIUM":
        return "Bot (Medium)";
      case "BOT_HARD":
        return "Bot (Hard)";
    }
  };

  const getSlotEmoji = (type: PlayerSlotType): string => {
    switch (type) {
      case "EMPTY":
        return "⭕";
      case "HUMAN":
        return "👤";
      case "BOT_EASY":
        return "🤖";
      case "BOT_MEDIUM":
        return "🤖";
      case "BOT_HARD":
        return "🤖";
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

          {/* Bot Configuration Section */}
          <div className="space-y-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  🤖 Bot Players
                </h2>
                <p className="text-sm text-slate-400">
                  Add AI opponents to your game
                </p>
              </div>
              <button
                onClick={() => {
                  setAllowBots(!allowBots);
                  if (!allowBots) {
                    // Reset slots when enabling bots
                    setPlayerSlots(["HUMAN", "EMPTY", "EMPTY", "EMPTY"]);
                  }
                }}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  allowBots
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                {allowBots ? "Enabled" : "Disabled"}
              </button>
            </div>

            {allowBots && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Configure each player slot (Player 1 is always you):
                </p>

                {[0, 1, 2, 3]
                  .slice(0, getGameModeConfig(selectedMode).maxPlayers)
                  .map((index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="text-2xl">
                        {getSlotEmoji(playerSlots[index])}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          Player {index + 1}
                          {index === 0 && (
                            <span className="ml-2 text-xs text-blue-400">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {getSlotLabel(playerSlots[index])}
                        </div>
                      </div>

                      {index === 0 ? (
                        // Player 1 is always the host (human)
                        <div className="px-3 py-1 bg-slate-700 rounded text-xs text-slate-400">
                          Host
                        </div>
                      ) : (
                        // Other slots can be configured
                        <select
                          value={playerSlots[index]}
                          onChange={(e) =>
                            updatePlayerSlot(
                              index,
                              e.target.value as PlayerSlotType
                            )
                          }
                          disabled={loading}
                          className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                        >
                          <option value="EMPTY">Empty Slot</option>
                          <option value="HUMAN">Human</option>
                          <option value="BOT_EASY">Bot - Easy</option>
                          <option value="BOT_MEDIUM" disabled>
                            Bot - Medium (Soon)
                          </option>
                          <option value="BOT_HARD" disabled>
                            Bot - Hard (Soon)
                          </option>
                        </select>
                      )}
                    </div>
                  ))}

                <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                  <p className="text-xs text-blue-300">
                    💡 <strong>Tip:</strong> Bots will play automatically when
                    it&apos;s their turn. Perfect for testing or playing solo!
                  </p>
                </div>
              </div>
            )}
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
