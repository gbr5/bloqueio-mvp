/**
 * Waiting Lobby Page - Dynamic Route
 *
 * URL: /room/[code]/lobby
 * Server-side loads room data, client polls for updates
 *
 * IMPORTANT: Direct URL access auto-joins the room if player not already in
 */

import { WaitingLobby } from "@/components/WaitingLobby";
import { loadGameRoom, joinGameRoom } from "@/lib/actions/game-room";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ isHost?: string; autoJoin?: string }>;
}

export default async function LobbyPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { isHost, autoJoin } = await searchParams;

  // Load room from database
  const result = await loadGameRoom(code);

  console.log("🚪 [Lobby Page] Loaded room:", code);

  if (result.error || !result.room) {
    // Room not found, redirect to home
    console.log("❌ [Lobby Page] Room not found, redirecting home");
    redirect("/");
  }

  // Check if user is accessing directly via URL (not from join flow)
  // If autoJoin is not set and isHost is not true, we should join them
  if (isHost !== "true" && autoJoin !== "false") {
    console.log("🔄 [Lobby Page] Direct URL access detected, auto-joining...");

    // Try to join the room
    const joinResult = await joinGameRoom(code);

    if (joinResult.error) {
      console.error("❌ [Lobby Page] Auto-join failed:", joinResult.error);
      // If room is full or game started, just let them spectate
      // (we'll handle this in the UI)
    } else {
      console.log("✅ [Lobby Page] Auto-joined as player", joinResult.playerId);
      // Redirect with autoJoin=false to prevent infinite loop
      redirect(
        `/room/${code}/lobby?isHost=false&autoJoin=false&playerId=${joinResult.playerId}`
      );
    }
  }

  return (
    <WaitingLobby
      roomCode={code}
      isHost={isHost === "true"}
      initialRoom={result.room}
    />
  );
}
