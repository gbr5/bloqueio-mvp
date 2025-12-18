/* eslint-disable react-hooks/exhaustive-deps */
// src/components/WaitingLobby.tsx
/**
 * WaitingLobby Component
 *
 * Shows all players in the room and allows the host to start the game.
 * Polls database for real-time updates.
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import { getRoomState } from "@/lib/actions/room-actions";
import { startGame } from "@/lib/actions/game-actions";
import { POLLING_INTERVALS } from "@/config/polling";
import { AuthOrGuestModal } from "./AuthOrGuestModal";
import { Loading } from "./Loading";
import { getGameModeConfig, type GameMode } from "@/types/game";
import type { RoomWithPlayers } from "@/types/room";

interface WaitingLobbyProps {
  roomCode: string;
}

export function WaitingLobby({ roomCode }: WaitingLobbyProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const [room, setRoom] = useState<RoomWithPlayers | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guestName, setGuestName] = useState<string | null>(() => {
    // Initialize from localStorage on mount
    if (typeof window !== "undefined") {
      return localStorage.getItem("guest_name");
    }
    return null;
  });

  // Check if user has identity (auth or guest name)
  const user = session?.user;
  const hasIdentity = !!user || !!guestName;

  // Show auth modal if user has no identity
  useEffect(() => {
    if (!sessionPending && !hasIdentity) {
      // Use timeout to avoid synchronous setState in effect
      const timer = setTimeout(() => setShowAuthModal(true), 0);
      return () => clearTimeout(timer);
    }
  }, [sessionPending, hasIdentity]);

  // Poll for room updates
  useEffect(() => {
    const loadRoom = async () => {
      const result = await getRoomState(roomCode);

      if ("error" in result) {
        setError(result.error || "Failed to load room");
        setLoading(false);
        return;
      }

      setRoom(result.room);
      setMyPlayerId(result.myPlayerId);
      setLoading(false);

      // If game started, navigate to game page
      if (result.room.status === "PLAYING") {
        router.push(`/room/${roomCode}/game`);
      }
    };

    loadRoom();
    const interval = setInterval(loadRoom, POLLING_INTERVALS.LOBBY);

    return () => clearInterval(interval);
  }, [roomCode, router]);

  // Auto-start game when room is full
  useEffect(() => {
    if (!room || starting) return;

    const config = getGameModeConfig(room.gameMode);
    const playerCount = room.players.length;

    // If room is full and we're the host (player 0), auto-start
    if (playerCount === config.maxPlayers && myPlayerId === 0) {
      handleStartGame();
    }
  }, [room, myPlayerId, starting]);

  const handleStartGame = async () => {
    if (!room) return;

    setStarting(true);

    try {
      const result = await startGame(roomCode);

      if ("error" in result) {
        toast.error(result.error);
        setStarting(false);
        return;
      }

      // Navigation will happen automatically via polling
    } catch (error) {
      console.error("Failed to start game:", error);
      toast.error("Falha ao iniciar jogo");
      setStarting(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Código copiado!");
  };

  const handleLeaveRoom = () => {
    // Clear session storage
    sessionStorage.removeItem(`room_${roomCode}_playerId`);
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
        <div className="text-center">
          <Loading size="xl" color="border-blue-500" className="mx-auto mb-4" />
          <p className="text-slate-400">Carregando lobby...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Sala não encontrada"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const isHost = myPlayerId === 0;
  const playerCount = room.players.length;
  const config = getGameModeConfig(
    (room.gameMode as GameMode) || "FOUR_PLAYER"
  );
  const canStart =
    isHost &&
    playerCount >= config.minPlayers &&
    playerCount <= config.maxPlayers &&
    (room.gameMode === "FOUR_PLAYER" || playerCount === 2); // 2P mode requires exactly 2

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Sala de Espera</h1>

          {/* Game Mode Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-500/50 rounded-lg px-4 py-2 mb-4">
            <span className="text-2xl">
              {room.gameMode === "TWO_PLAYER" ? "🎯" : "🎲"}
            </span>
            <span className="text-sm font-semibold text-blue-300">
              {config.label} • {config.wallsPerPlayer} barreiras cada
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="bg-slate-800 border border-slate-600 rounded-lg px-6 py-3">
              <p className="text-sm text-slate-400 mb-1">Código da Sala</p>
              <p className="text-3xl font-mono font-bold text-white tracking-wider">
                {roomCode}
              </p>
            </div>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold"
            >
              Copiar
            </button>
          </div>
        </div>

        {/* Player List */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              Jogadores ({playerCount}/{config.maxPlayers})
            </h2>
            {playerCount < config.minPlayers && (
              <p className="text-sm text-yellow-400">
                {room.gameMode === "TWO_PLAYER"
                  ? "Aguardando 1 jogador"
                  : "Mínimo de 2 jogadores"}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {room.players.map((player) => (
              <div
                key={player.playerId}
                className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-700 rounded-lg"
              >
                <div
                  className="w-12 h-12 rounded-full border-2 border-white shrink-0"
                  style={{ backgroundColor: player.color }}
                />
                <div className="flex-1">
                  <p className="text-white font-semibold">{player.name}</p>
                  <p className="text-sm text-slate-400">
                    Jogador {player.playerId + 1}
                  </p>
                </div>
                <div className="flex gap-2">
                  {player.playerId === myPlayerId && (
                    <span className="px-3 py-1 bg-blue-600/30 border border-blue-500 text-blue-300 text-xs font-semibold rounded-full">
                      VOCÊ
                    </span>
                  )}
                  {player.playerId === 0 && (
                    <span className="px-3 py-1 bg-yellow-600/30 border border-yellow-500 text-yellow-300 text-xs font-semibold rounded-full">
                      ANFITRIÃO
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Empty slots - show only for available positions */}
            {[...Array(config.maxPlayers - playerCount)].map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-4 p-4 border-2 border-dashed border-slate-700 rounded-lg opacity-50"
              >
                <div className="w-12 h-12 rounded-full bg-slate-700 shrink-0" />
                <div className="flex-1">
                  <p className="text-slate-500">Aguardando jogador...</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={!canStart || starting}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
            >
              {starting ? (
                <>
                  <Loading size="md" />
                  <span>Iniciando Jogo...</span>
                </>
              ) : (
                <>
                  <span>🎮</span>
                  <span>Iniciar Jogo</span>
                </>
              )}
            </button>
          ) : (
            <div className="w-full py-4 px-6 bg-slate-700/50 border border-slate-600 text-slate-400 font-semibold text-center rounded-lg">
              Aguardando anfitrião iniciar...
            </div>
          )}

          <button
            onClick={handleLeaveRoom}
            disabled={starting}
            className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors duration-200"
          >
            Sair da Sala
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
          <p className="text-sm text-slate-400 text-center">
            {isHost
              ? "Compartilhe o código da sala com amigos. Inicie quando todos estiverem prontos!"
              : "Aguardando o host iniciar o jogo..."}
          </p>
        </div>
      </div>

      {/* Auth/Guest Modal */}
      <AuthOrGuestModal
        isOpen={showAuthModal}
        onClose={() => {
          // If user closes without identity, redirect home
          if (!hasIdentity) {
            router.push("/");
          }
          setShowAuthModal(false);
        }}
        onComplete={() => {
          // Refresh guest name from localStorage
          const storedName = localStorage.getItem("guest_name");
          if (storedName) {
            setGuestName(storedName);
          }
          setShowAuthModal(false);
        }}
      />
    </div>
  );
}
