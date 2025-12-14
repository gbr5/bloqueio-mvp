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

import { useState, useEffect } from "react";
import type { GameRoom } from "@/types/game";

interface WaitingLobbyProps {
  roomCode: string;
  isHost: boolean;
  onStartGame: () => void;
  onLeave: () => void;
}

// Mock player data - will be replaced with real data from GameRoom
interface MockPlayer {
  id: number;
  name: string;
  color: string;
  isHost?: boolean;
}

export function WaitingLobby({
  roomCode,
  isHost,
  onStartGame,
  onLeave,
}: WaitingLobbyProps) {
  const [players, setPlayers] = useState<MockPlayer[]>([
    { id: 0, name: "Player 1 (You)", color: "#ef4444", isHost: true },
  ]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Polling logic - will be replaced with real hook call
  useEffect(() => {
    const pollInterval = setInterval(() => {
      // TODO: Replace with real useGameRoom.loadRoom(roomCode)
      console.log("Polling for room updates...");

      // Mock: simulate player joining after 5 seconds
      if (players.length === 1) {
        setTimeout(() => {
          setPlayers((prev) => [
            ...prev,
            { id: 1, name: "Player 2", color: "#3b82f6" },
          ]);
        }, 5000);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [roomCode, players.length]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleStartGame = () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start");
      return;
    }
    setLoading(true);
    onStartGame();
  };

  const canStart = isHost && players.length >= 2 && players.length <= 4;

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
            Players ({players.length}/4)
          </h2>
          <div className="space-y-3">
            {players.map((player) => (
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
                {player.isHost && (
                  <span className="px-2 py-1 bg-yellow-600 text-xs font-semibold rounded text-white">
                    HOST
                  </span>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: 4 - players.length }).map((_, i) => (
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
            {players.length < 2 && "Waiting for at least 2 players to start..."}
            {players.length >= 2 &&
              players.length < 4 &&
              "Ready to start! More players can join until game begins."}
            {players.length === 4 && "Room is full! Ready to start."}
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
            onClick={onLeave}
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
