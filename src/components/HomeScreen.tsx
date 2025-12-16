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

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { AuthModal } from "./AuthModal";
import { AuthOrGuestModal } from "./AuthOrGuestModal";
import { UserMenu } from "./UserMenu";
import { Leaderboard } from "./Leaderboard";

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
  const [showAuthOrGuestModal, setShowAuthOrGuestModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(
    null
  );
  const [guestName, setGuestName] = useState<string | null>(null);

  const user = session?.user;

  // Load guest name from localStorage on mount
  useEffect(() => {
    const storedName = localStorage.getItem("guest_name");
    if (storedName) {
      setGuestName(storedName);
    }
  }, []);

  // Check if user can proceed (authenticated or has guest name)
  const canProceed = !!user || !!guestName;

  // Handle create/join button clicks
  const handleCreateRoom = useCallback(() => {
    if (canProceed) {
      onCreateRoom();
    } else {
      setPendingAction("create");
      setShowAuthOrGuestModal(true);
    }
  }, [canProceed, onCreateRoom]);

  const handleJoinRoom = useCallback(() => {
    if (canProceed) {
      onJoinRoom();
    } else {
      setPendingAction("join");
      setShowAuthOrGuestModal(true);
    }
  }, [canProceed, onJoinRoom]);

  // Handle auth/guest modal completion
  const handleAuthOrGuestComplete = useCallback(() => {
    // Refresh guest name from localStorage
    const storedName = localStorage.getItem("guest_name");
    if (storedName) {
      setGuestName(storedName);
    }

    // Execute pending action
    if (pendingAction === "create") {
      onCreateRoom();
    } else if (pendingAction === "join") {
      onJoinRoom();
    }
    setPendingAction(null);
  }, [pendingAction, onCreateRoom, onJoinRoom]);

  // Get display name for welcome message
  const displayName = user?.name?.split(" ")[0] || guestName;

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
        <div className="w-full max-w-4xl px-8 flex gap-8 items-start">
          {/* Left side - Leaderboard (desktop only) */}
          <div className="hidden lg:block w-72 shrink-0">
            <Leaderboard limit={5} />
          </div>

          {/* Center - Main Menu */}
          <div className="flex-1 max-w-md mx-auto">
          {/* Title */}
          <h1 className="text-6xl font-bold text-center mb-4 text-white tracking-wider">
            BLOQUEIO
          </h1>

          {/* Welcome Message */}
          {displayName && (
            <p className="text-center text-blue-400 mb-4">
              Bem-vindo, {displayName}!
            </p>
          )}

          {/* Subtitle */}
          <p className="text-center text-slate-400 mb-12">
            Jogo estratégico de barreiras
          </p>

          {/* Menu Options */}
          <div className="space-y-4">
            {/* Create New Game */}
            <button
              onClick={handleCreateRoom}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-blue-500/50"
            >
              Criar Novo Jogo
            </button>

            {/* Join Game */}
            <button
              onClick={handleJoinRoom}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-green-500/50"
            >
              Entrar em Jogo
            </button>

            {/* Play Offline */}
            <button
              onClick={onPlayOffline}
              className="w-full py-4 px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
            >
              Jogar Offline
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
                  Crie uma conta
                </button>{" "}
                para salvar suas estatísticas e acompanhar seu progresso!
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-slate-500 text-sm">
            <p>Jogo de tabuleiro estratégico para 4 jogadores</p>
            <p className="mt-2">
              Corra para o lado oposto enquanto bloqueia oponentes
            </p>
          </div>

          {/* Mobile Leaderboard */}
          <div className="lg:hidden mt-8">
            <Leaderboard limit={5} />
          </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // Refresh session state will happen automatically
          setShowAuthModal(false);
        }}
      />

      {/* Auth or Guest Modal */}
      <AuthOrGuestModal
        isOpen={showAuthOrGuestModal}
        onClose={() => {
          setShowAuthOrGuestModal(false);
          setPendingAction(null);
        }}
        onComplete={handleAuthOrGuestComplete}
      />
    </div>
  );
}
