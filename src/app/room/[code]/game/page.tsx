/**
 * Game Room Page - Dynamic Route
 *
 * URL: /room/[code]/game
 * Main game interface for active multiplayer games
 */

import { GameBoard } from "@/components/GameBoard";
import { loadGameRoom } from "@/lib/actions/game-room";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ playerId?: string }>;
}

export default async function GamePage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { playerId } = await searchParams;

  // Load room from database
  const result = await loadGameRoom(code);

  if (result.error || !result.room) {
    redirect("/");
  }

  if (result.room.status !== "playing") {
    // Game hasn't started yet, redirect to lobby
    redirect(`/room/${code}/lobby`);
  }

  return <GameBoard roomCode={code} initialRoom={result.room} />;
}
