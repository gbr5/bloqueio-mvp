/**
 * GameBoard Component - Multiplayer Game Interface
 *
 * Wraps the game logic with Prisma-based multiplayer state:
 * - Polls database for real-time updates
 * - Syncs moves via server actions
 * - Validates turns server-side
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { getRoomState } from "@/lib/actions/room-actions";
import { makeMove, placeBarrier } from "@/lib/actions/game-actions";
import { getAdaptiveInterval } from "@/config/polling";
import type { Player, Barrier, Room } from "@prisma/client";
import BloqueioPage from "@/app/game";
import type { GameSnapshot } from "@/types/game";

interface GameBoardProps {
  roomCode: string;
}

type RoomWithPlayers = Room & {
  players: Player[];
  barriers: Barrier[];
};

export function GameBoard({ roomCode }: GameBoardProps) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomWithPlayers | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);

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
    if (!room || myPlayerId === null) return;

    const currentPlayer = room.players.find((p) => p.playerId === myPlayerId);
    const newPlayerState = newState.players.find((p) => p.id === myPlayerId);

    if (!currentPlayer || !newPlayerState) return;

    // Detect if this is a move or barrier placement
    const movedPosition =
      currentPlayer.row !== newPlayerState.row ||
      currentPlayer.col !== newPlayerState.col;
    const placedBarrier = newState.barriers.length > room.barriers.length;

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
        toast.error(`Move rejected: ${result.error}`);
        // Rollback: Refresh from server
        const refreshResult = await getRoomState(roomCode);
        if (!("error" in refreshResult)) {
          setRoom(refreshResult.room);
        }
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
        toast.error(`Barrier rejected: ${result.error}`);
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
        }
      }
    }
  };

  if (!room || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading game...</p>
        </div>
      </div>
    );
  }

  const isMyTurn = myPlayerId === room.currentTurn;

  return (
    <div className="relative">
      {/* Game Info Header */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-4 shadow-lg space-y-2 text-sm">
          <p className="font-semibold">Room: {roomCode}</p>
          {myPlayerId !== null && (
            <p className="text-slate-300">You are: Player {myPlayerId + 1}</p>
          )}
          <div className="border-t border-slate-600 pt-2">
            <p className="text-slate-400 text-xs">
              Current Turn: Player {gameState.currentPlayerId + 1}
            </p>
            {isMyTurn ? (
              <p className="text-green-400 font-semibold text-xs mt-1">
                ✓ Your turn!
              </p>
            ) : (
              <p className="text-yellow-400 text-xs mt-1">
                Waiting for opponent...
              </p>
            )}
          </div>
          {gameState.winner !== null && (
            <div className="border-t border-slate-600 pt-2">
              <p className="text-yellow-400 font-bold">
                🏆 Player {gameState.winner + 1} wins!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Game board */}
      <BloqueioPage
        gameState={gameState}
        onGameStateChange={handleGameStateChange}
        myPlayerId={myPlayerId}
        disabled={!isMyTurn || gameState.winner !== null}
      />

      {/* Game Over Modal */}
      {showGameOver && gameState.winner !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <div className="text-6xl">🏆</div>
                <h2 className="text-3xl font-bold text-yellow-400">
                  Game Over!
                </h2>
                <p className="text-2xl text-white">
                  {myPlayerId === gameState.winner
                    ? "You Win!"
                    : `Player ${gameState.winner + 1} Wins!`}
                </p>
              </div>

              {/* Player Stats */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">
                  Final Standings
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
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
