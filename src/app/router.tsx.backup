/**
 * Main Router Component
 *
 * Manages screen navigation between:
 * - HomeScreen: Create/Join/Offline menu
 * - CreateRoom: Room creation flow
 * - JoinRoom: Room joining flow
 * - WaitingLobby: Pre-game lobby
 * - Game: Main game (existing implementation)
 */

"use client";

import { useState } from "react";
import { HomeScreen } from "@/components/HomeScreen";
import { CreateRoom } from "@/components/CreateRoom";
import { JoinRoom } from "@/components/JoinRoom";
import { WaitingLobby } from "@/components/WaitingLobby";

type Screen = "home" | "create" | "join" | "lobby" | "game";

interface GameState {
  screen: Screen;
  roomCode?: string;
  isHost?: boolean;
}

export default function RouterPage() {
  const [gameState, setGameState] = useState<GameState>({
    screen: "home",
  });

  // Navigation handlers
  const goToHome = () => setGameState({ screen: "home" });
  const goToCreate = () => setGameState({ screen: "create" });
  const goToJoin = () => setGameState({ screen: "join" });

  const goToLobby = (roomCode: string, isHost: boolean) => {
    setGameState({ screen: "lobby", roomCode, isHost });
  };

  const startGame = () => {
    setGameState((prev) => ({ ...prev, screen: "game" }));
  };

  // Screen rendering
  switch (gameState.screen) {
    case "home":
      return (
        <HomeScreen
          onCreateRoom={goToCreate}
          onJoinRoom={goToJoin}
          onPlayOffline={startGame}
        />
      );

    case "create":
      return (
        <CreateRoom
          onRoomCreated={(roomCode) => goToLobby(roomCode, true)}
          onCancel={goToHome}
        />
      );

    case "join":
      return (
        <JoinRoom
          onRoomJoined={(roomCode) => goToLobby(roomCode, false)}
          onCancel={goToHome}
        />
      );

    case "lobby":
      return (
        <WaitingLobby
          roomCode={gameState.roomCode || ""}
          isHost={gameState.isHost || false}
          onStartGame={startGame}
          onLeave={goToHome}
        />
      );

    case "game":
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Game Coming Soon</h1>
            <p className="text-slate-400 mb-6">
              {gameState.roomCode
                ? `Room: ${gameState.roomCode}`
                : "Offline Mode"}
            </p>
            <button
              onClick={goToHome}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
}
