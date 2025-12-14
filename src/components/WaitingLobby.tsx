/**
 * WaitingLobby Component
 *
 * Displays room information and players:
 * - Polls database every 2 seconds for updates
 * - Shows room code and player list
 * - Host can start game when 2+ players
 * - All players can leave room
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { loadGameRoom, startGame } from "@/lib/actions/game-room";
import type { GameRoom } from "@/types/game";

interface WaitingLobbyProps {
  roomCode: string;
  isHost: boolean;
  initialRoom: GameRoom;
}

export function WaitingLobby({
  roomCode,
  isHost,
  initialRoom,
}: WaitingLobbyProps) {
  const router = useRouter();
  const [room, setRoom] = useState<GameRoom>(initialRoom);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Poll for room updates every 2 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await loadGameRoom(roomCode);
        if (result.room) {
          setRoom(result.room);

          // If game started, navigate to game page
          if (result.room.status === "playing") {
            router.push(`/room/${roomCode}/game`);
          }
        }
      } catch (error) {
        console.error("Failed to poll room:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [roomCode, router]);

  const players = room.game_state.players;
  const playerCount = useMemo(() => (players ? players.length : 0), [players]);

  // Loading state - show spinner while room loads
  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading lobby...</p>
        </div>
      </div>
    );
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleStartGame = async () => {
    if (playerCount < 2) {
      alert("Need at least 2 players to start");
      return;
    }

    setLoading(true);

    try {
      const result = await startGame(roomCode);

      if (result.error) {
        alert(result.error);
        setLoading(false);
        return;
      }

      console.log("✅ [WaitingLobby] Game started, navigating to game board");

      // Navigate to game board
      router.push(`/room/${roomCode}/game`);
    } catch (error) {
      console.error("Failed to start game:", error);
      alert("Failed to start game");
      setLoading(false);
    }
  };

  const handleLeave = () => {
    router.push("/");
  };

  const canStart = isHost && playerCount >= 2 && playerCount <= 4;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
      <div className="w-full max-w-2xl px-8">
        <h1 className="text-4xl font-bold text-center mb-8 text-white">
          Waiting Lobby
        </h1>

        {/* Room Code Display */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Room Code</p>
            <div className="flex items-center justify-center gap-4">
              <p className="text-4xl font-mono font-bold text-blue-400 tracking-widest">
                {roomCode}
              </p>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
            </div>
            <p className="text-slate-500 text-sm mt-2">
              Share this code with friends to invite them
            </p>
          </div>
        </div>

        {/* Players List */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Players ({playerCount}/4)
          </h2>
          <div className="space-y-3">
            {players &&
              players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"
                >
                  {/* Color indicator */}
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white"
                    style={{ backgroundColor: player.color }}
                  />

                  {/* Player name */}
                  <span className="text-white font-medium flex-1">
                    {player.name}
                  </span>

                  {/* Host badge */}
                  {player.id === room.host_player_id && (
                    <span className="px-2 py-1 bg-yellow-600 text-xs font-semibold rounded text-white">
                      HOST
                    </span>
                  )}
                </div>
              ))}

            {/* Empty slots */}
            {Array.from({ length: 4 - playerCount }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 p-3 bg-slate-900/20 rounded-lg border border-dashed border-slate-700"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700" />
                <span className="text-slate-600 italic">
                  Waiting for player...
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Game Info */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-blue-200 text-sm text-center">
            {playerCount < 2 && "Waiting for at least 2 players to start..."}
            {playerCount >= 2 &&
              playerCount < 4 &&
              "Ready to start! More players can join until game begins."}
            {playerCount === 4 && "Room is full! Ready to start."}
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart || loading}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
            >
              {loading
                ? "Starting..."
                : canStart
                ? "Start Game"
                : "Waiting for players..."}
            </button>
          )}

          {!isHost && (
            <div className="py-4 px-6 bg-slate-800 border border-slate-700 text-center text-slate-300 rounded-lg">
              Waiting for host to start the game...
            </div>
          )}

          <button
            onClick={handleLeave}
            disabled={loading}
            className="w-full py-3 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors duration-200"
          >
            Leave Room
          </button>
        </div>

        {/* Connection Status */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
