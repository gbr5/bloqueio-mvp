// src/components/GameBoard.tsx
/**
 * GameBoard Component - Multiplayer Game Interface
 *
 * Wraps the game logic with Prisma-based multiplayer state:
 * - Polls database for real-time updates
 * - Syncs moves via server actions
 * - Validates turns server-side
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Loading } from "./Loading";
import { playTurnSound } from "@/lib/sounds";
import { getRoomState } from "@/lib/actions/room-actions";
import {
  makeMove,
  placeBarrier,
  undoLastAction,
} from "@/lib/actions/game-actions";
import { getAdaptiveInterval } from "@/config/polling";
import type { Barrier } from "@prisma/client";
import BloqueioPage from "@/app/game";
import type { GameSnapshot } from "@/types/game";
import type { RoomWithPlayers } from "@/types/room";

interface GameBoardProps {
  roomCode: string;
}

export function GameBoard({ roomCode }: GameBoardProps) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomWithPlayers | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  // Track previous turn to detect when it becomes player's turn
  const prevTurnRef = useRef<number | null>(null);

  // Poll for game state updates - ONLY when waiting for opponent
  useEffect(() => {
    const loadRoom = async () => {
      const result = await getRoomState(roomCode);

      if ("error" in result) {
        console.error("Failed to load room:", result.error);
        return;
      }

      setRoom(result.room);
      setMyPlayerId(result.myPlayerId);

      // Validate that current player exists in players array
      const currentPlayer = result.room.players.find(
        (p) => p.playerId === result.room.currentTurn
      );

      if (!currentPlayer && result.room.players.length > 0) {
        console.error(
          `[GameBoard] Current turn ${result.room.currentTurn} not found in players`,
          result.room.players.map((p) => ({ id: p.playerId, name: p.name }))
        );
        toast.error("Erro no estado do jogo. Retornando ao início...");
        setTimeout(() => router.push("/"), 2000);
        return;
      }

      // Check if player can undo (they just moved and it's now opponent's turn)
      const previousPlayerId =
        (result.room.currentTurn - 1 + result.room.players.length) %
        result.room.players.length;
      setCanUndo(
        result.myPlayerId === previousPlayerId && result.room.winner === null
      );

      // Check for winner
      if (result.room.winner !== null && !showGameOver) {
        setShowGameOver(true);
      }

      // If returned to waiting, go to lobby
      if (result.room.status === "WAITING") {
        router.push(`/room/${roomCode}/lobby`);
      }
    };

    loadRoom(); // Initial load

    // Adaptive polling - only when it's NOT your turn
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);

      // Calculate adaptive interval from config
      const interval = room
        ? getAdaptiveInterval(new Date(room.updatedAt).getTime())
        : 15000; // Default while loading

      console.log("Using polling interval:", interval);

      if (interval === null) {
        // Room is very idle, stop polling
        return;
      }

      intervalId = setInterval(() => {
        if (room && myPlayerId !== null && room.currentTurn !== myPlayerId) {
          loadRoom();
        }
      }, interval);
    };

    startPolling();

    // Restart polling when room changes (adjusts interval)
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [roomCode, router, showGameOver, room, myPlayerId]);

  // Play sound when it becomes the player's turn
  useEffect(() => {
    if (room && myPlayerId !== null) {
      const isMyTurn = room.currentTurn === myPlayerId;
      const wasMyTurn = prevTurnRef.current === myPlayerId;

      // Play sound only when turn CHANGES to player's turn (not on initial load)
      if (isMyTurn && !wasMyTurn && prevTurnRef.current !== null) {
        playTurnSound();
      }

      prevTurnRef.current = room.currentTurn;
    }
  }, [room?.currentTurn, myPlayerId, room]);

  // Helper function to compute blocked edges from barriers
  const computeBlockedEdges = (barriers: Barrier[]): string[] => {
    const edges: string[] = [];

    const edgeKey = (r1: number, c1: number, r2: number, c2: number) => {
      if (r1 > r2 || (r1 === r2 && c1 > c2)) {
        [r1, r2] = [r2, r1];
        [c1, c2] = [c2, c1];
      }
      return `${r1},${c1}-${r2},${c2}`;
    };

    for (const barrier of barriers) {
      if (barrier.orientation === "HORIZONTAL") {
        // Horizontal barrier blocks 2 edges
        edges.push(
          edgeKey(barrier.row, barrier.col, barrier.row + 1, barrier.col)
        );
        edges.push(
          edgeKey(
            barrier.row,
            barrier.col + 1,
            barrier.row + 1,
            barrier.col + 1
          )
        );
      } else {
        // Vertical barrier blocks 2 edges
        edges.push(
          edgeKey(barrier.row, barrier.col, barrier.row, barrier.col + 1)
        );
        edges.push(
          edgeKey(
            barrier.row + 1,
            barrier.col,
            barrier.row + 1,
            barrier.col + 1
          )
        );
      }
    }

    return edges;
  };

  // Convert Prisma models to GameSnapshot format
  const gameState: GameSnapshot | null = room
    ? {
        players: room.players.map((p) => ({
          id: p.playerId as 0 | 1 | 2 | 3,
          row: p.row,
          col: p.col,
          goalSide: p.goalSide as "TOP" | "RIGHT" | "BOTTOM" | "LEFT",
          wallsLeft: p.wallsLeft,
          color: p.color,
          label: `P${p.playerId + 1}`,
          name: p.name,
          playerType: p.playerType, // Pass bot type info to game UI
        })),
        barriers: room.barriers.map((b) => ({
          id: b.id,
          row: b.row,
          col: b.col,
          orientation:
            b.orientation === "HORIZONTAL" ? ("H" as const) : ("V" as const),
          placedBy: b.placedBy as 0 | 1 | 2 | 3,
        })),
        blockedEdges: computeBlockedEdges(room.barriers),
        currentPlayerId: room.currentTurn as 0 | 1 | 2 | 3,
        winner: room.winner as (0 | 1 | 2 | 3) | null,
      }
    : null;

  // Handle moves from BloqueioPage with optimistic updates
  const handleGameStateChange = async (newState: GameSnapshot) => {
    if (!room || myPlayerId === null || isLoading) return;

    const currentPlayer = room.players.find((p) => p.playerId === myPlayerId);
    const newPlayerState = newState.players.find((p) => p.id === myPlayerId);

    if (!currentPlayer || !newPlayerState) return;

    // Detect if this is a move or barrier placement
    const movedPosition =
      currentPlayer.row !== newPlayerState.row ||
      currentPlayer.col !== newPlayerState.col;
    const placedBarrier = newState.barriers.length > room.barriers.length;

    setIsLoading(true);
    setCanUndo(false);

    if (movedPosition) {
      // OPTIMISTIC UPDATE: Apply move immediately to UI
      const optimisticRoom: RoomWithPlayers = {
        ...room,
        players: room.players.map((p) =>
          p.playerId === myPlayerId
            ? { ...p, row: newPlayerState.row, col: newPlayerState.col }
            : p
        ),
        currentTurn: ((room.currentTurn + 1) % room.players.length) as
          | 0
          | 1
          | 2
          | 3,
        updatedAt: new Date(),
      };

      setRoom(optimisticRoom);

      // Server validation in background
      const result = await makeMove(
        roomCode,
        newPlayerState.row,
        newPlayerState.col
      );

      if ("error" in result) {
        toast.error(`Movimento rejeitado: ${result.error}`);
        // Rollback: Refresh from server
        const refreshResult = await getRoomState(roomCode);
        if (!("error" in refreshResult)) {
          setRoom(refreshResult.room);
        }
      } else {
        // Success - player can now undo
        setCanUndo(true);
      }
    } else if (placedBarrier) {
      // OPTIMISTIC UPDATE: Apply barrier immediately to UI
      const newBarrier = newState.barriers[newState.barriers.length - 1];
      const orientation =
        newBarrier.orientation === "H" ? "HORIZONTAL" : "VERTICAL";

      const optimisticRoom: RoomWithPlayers = {
        ...room,
        barriers: [
          ...room.barriers,
          {
            id: `temp-${Date.now()}`,
            roomId: room.id,
            row: newBarrier.row,
            col: newBarrier.col,
            orientation,
            placedBy: myPlayerId,
            createdAt: new Date(),
          },
        ],
        players: room.players.map((p) =>
          p.playerId === myPlayerId ? { ...p, wallsLeft: p.wallsLeft - 1 } : p
        ),
        currentTurn: ((room.currentTurn + 1) % room.players.length) as
          | 0
          | 1
          | 2
          | 3,
        updatedAt: new Date(),
      };

      setRoom(optimisticRoom);

      // Server validation in background
      const result = await placeBarrier(
        roomCode,
        newBarrier.row,
        newBarrier.col,
        orientation
      );

      if ("error" in result) {
        toast.error(`Barreira rejeitada: ${result.error}`);
        // Rollback: Refresh from server
        const refreshResult = await getRoomState(roomCode);
        if (!("error" in refreshResult)) {
          setRoom(refreshResult.room);
        }
      } else {
        // Success: Refresh to get real barrier ID from server
        const refreshResult = await getRoomState(roomCode);
        if (!("error" in refreshResult)) {
          setRoom(refreshResult.room);
          setCanUndo(true);
        }
      }
    }

    setIsLoading(false);
  };

  // Handle undo action
  const handleUndo = async () => {
    if (!canUndo || isLoading) return;

    setIsLoading(true);

    const result = await undoLastAction(roomCode);

    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Ação desfeita");
      // Refresh state from server
      const refreshResult = await getRoomState(roomCode);
      if (!("error" in refreshResult)) {
        setRoom(refreshResult.room);
      }
      setCanUndo(false);
    }

    setIsLoading(false);
  };

  if (!room || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
        <div className="text-center">
          <Loading size="xl" color="border-blue-500" className="mx-auto mb-4" />
          <p className="text-slate-400">Carregando jogo...</p>
        </div>
      </div>
    );
  }

  const isMyTurn = myPlayerId === room.currentTurn;

  // Get current player's name for display
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const currentTurnPlayer = gameState.players.find(
    (p) => p.id === gameState.currentPlayerId
  );

  return (
    <div className="relative">
      {/* Game Info Header - responsive positioning */}
      <div className="fixed sm:absolute bottom-4 left-4 right-4 sm:right-auto sm:bottom-auto sm:top-4 z-10">
        <div className="bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg p-3 sm:p-4 shadow-lg text-sm">
          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-start sm:gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">Sala:</span>
              <span className="font-mono font-semibold text-white">
                {roomCode}
              </span>
            </div>
            {myPlayer && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full border border-white/50"
                  style={{ backgroundColor: myPlayer.color }}
                />
                <span className="text-slate-300 text-xs sm:text-sm">
                  {myPlayer.name}
                </span>
              </div>
            )}
          </div>
          <div className="border-t border-slate-600 mt-2 pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 text-xs">Turno:</span>
              <div className="flex items-center gap-2">
                {currentTurnPlayer && (
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentTurnPlayer.color }}
                  />
                )}
                <span className="text-white text-xs font-medium">
                  {currentTurnPlayer?.name ??
                    `Jogador ${gameState.currentPlayerId + 1}`}
                </span>
              </div>
            </div>
            {isMyTurn ? (
              <p className="text-green-400 font-semibold text-xs mt-1 text-center sm:text-left">
                ✓ Sua vez!
              </p>
            ) : (
              <p className="text-yellow-400 text-xs mt-1 text-center sm:text-left">
                Aguardando oponente...
              </p>
            )}
          </div>
          {gameState.winner !== null && (
            <div className="border-t border-slate-600 pt-2 mt-2">
              <p className="text-yellow-400 font-bold text-center">
                🏆{" "}
                {gameState.players.find((p) => p.id === gameState.winner)
                  ?.name ?? `Jogador ${gameState.winner + 1}`}{" "}
                venceu!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Undo Button - shown when player can undo */}
      {canUndo && !isMyTurn && (
        <div className="fixed sm:absolute bottom-20 sm:bottom-auto right-4 sm:top-4 z-10">
          <button
            onClick={handleUndo}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-lg text-sm"
          >
            {isLoading ? (
              <Loading size="sm" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            )}
            Desfazer
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20 pointer-events-none">
          <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg px-6 py-3 flex items-center gap-3">
            <Loading size="md" color="border-blue-500" />
            <span className="text-white text-sm">Processando...</span>
          </div>
        </div>
      )}

      {/* Game board */}
      <BloqueioPage
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
        myPlayerId={myPlayerId}
        disabled={!isMyTurn || gameState.winner !== null || isLoading}
      />

      {/* Game Over Modal */}
      {showGameOver && gameState.winner !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <div className="text-5xl sm:text-6xl">🏆</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400">
                  Fim de Jogo!
                </h2>
                <p className="text-xl sm:text-2xl text-white">
                  {myPlayerId === gameState.winner
                    ? "Você Venceu!"
                    : `${
                        gameState.players.find((p) => p.id === gameState.winner)
                          ?.name ?? `Jogador ${gameState.winner + 1}`
                      } Venceu!`}
                </p>
              </div>

              {/* Player Stats */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">
                  Resultado Final
                </h3>
                <div className="space-y-2">
                  {gameState.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-2 rounded ${
                        player.id === gameState.winner
                          ? "bg-yellow-900/30 border border-yellow-600"
                          : "bg-slate-800/30"
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shrink-0"
                        style={{ backgroundColor: player.color }}
                      />
                      <span className="text-white text-sm flex-1">
                        {player.name}
                      </span>
                      {player.id === gameState.winner && (
                        <span className="text-yellow-400 text-lg">👑</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push("/")}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
