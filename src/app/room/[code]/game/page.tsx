/**
 * Game Room Page - Dynamic Route
 *
 * URL: /room/[code]/game
 * Main game interface for active multiplayer games
 */

import { GameBoard } from "@/components/GameBoard";
import { getRoomState } from "@/lib/actions/room-actions";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function GamePage({ params }: PageProps) {
  const { code } = await params;

  // Verify room exists and game has started
  const result = await getRoomState(code);

  if (result.error || !result.room) {
    redirect("/");
  }

  if (result.room.status !== "PLAYING") {
    // Game hasn't started yet, redirect to lobby
    redirect(`/room/${code}/lobby`);
  }

  return <GameBoard roomCode={code} />;
}
