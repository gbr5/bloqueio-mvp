/**
 * HomeScreen Component
 *
 * Entry point for the game - allows users to:
 * - Create a new multiplayer room
 * - Join an existing room
 * - Play offline (local hot-seat)
 * - Sign in/Sign up for an account
 */

"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { AuthModal } from "./AuthModal";
import { UserMenu } from "./UserMenu";

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
  const { data: session, isPending } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const user = session?.user;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-radial from-slate-950 to-black">
      {/* Header with Auth */}
      <header className="p-4 flex justify-end">
        {isPending ? (
          <div className="w-8 h-8 rounded-full bg-slate-700 animate-pulse" />
        ) : user ? (
          <UserMenu
            user={{
              name: user.name,
              email: user.email,
              image: user.image,
            }}
          />
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-colors"
          >
            Sign In
          </button>
        )}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md px-8">
          {/* Title */}
          <h1 className="text-6xl font-bold text-center mb-4 text-white tracking-wider">
            BLOQUEIO
          </h1>

          {/* Welcome Message */}
          {user && (
            <p className="text-center text-blue-400 mb-4">
              Welcome back, {user.name.split(" ")[0]}!
            </p>
          )}

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

          {/* Sign Up Prompt for Guests */}
          {!user && !isPending && (
            <div className="mt-8 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <p className="text-slate-300 text-sm text-center">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Create an account
                </button>{" "}
                to save your game stats and track your progress!
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-slate-500 text-sm">
            <p>4-player strategic board game</p>
            <p className="mt-2">
              Race to opposite sides while blocking opponents
            </p>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
