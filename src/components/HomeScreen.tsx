/**
 * HomeScreen Component
 *
 * Entry point for the game - allows users to:
 * - Create a new multiplayer room
 * - Join an existing room
 * - Play offline (local hot-seat)
 */

"use client";

interface HomeScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onPlayOffline: () => void;
}

export function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  onPlayOffline,
}: HomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
      <div className="w-full max-w-md px-8">
        {/* Title */}
        <h1 className="text-6xl font-bold text-center mb-12 text-white tracking-wider">
          BLOQUEIO
        </h1>

        {/* Subtitle */}
        <p className="text-center text-slate-400 mb-12">
          Strategic barrier placement game
        </p>

        {/* Menu Options */}
        <div className="space-y-4">
          {/* Create New Game */}
          <button
            onClick={onCreateRoom}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-blue-500/50"
          >
            Create New Game
          </button>

          {/* Join Game */}
          <button
            onClick={onJoinRoom}
            className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-green-500/50"
          >
            Join Game
          </button>

          {/* Play Offline */}
          <button
            onClick={onPlayOffline}
            className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
          >
            Play Offline
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-slate-500 text-sm">
          <p>4-player strategic board game</p>
          <p className="mt-2">
            Race to opposite sides while blocking opponents
          </p>
        </div>
      </div>
    </div>
  );
}
