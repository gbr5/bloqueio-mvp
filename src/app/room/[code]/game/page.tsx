/**
 * Game Room Page - Dynamic Route
 *
 * URL: /room/[code]/game
 * Main game interface for active multiplayer games
 */

import { loadGameRoom } from "@/lib/actions/game-room";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function GamePage({ params }: PageProps) {
  const { code } = await params;

  // Load room from database
  const result = await loadGameRoom(code);

  if (result.error || !result.room) {
    redirect("/");
  }

  if (result.room.status !== "playing") {
    // Game hasn't started yet, redirect to lobby
    redirect(`/room/${code}/lobby`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-radial from-slate-950 to-black">
      <div className="text-center text-white">
        <h1 className="text-4xl font-bold mb-4">Game Room: {code}</h1>
        <p className="text-slate-400 mb-6">
          Multiplayer game will be integrated here
        </p>
        <p className="text-sm text-slate-500">Status: {result.room.status}</p>
      </div>
    </div>
  );
}
