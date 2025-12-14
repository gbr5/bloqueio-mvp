/**
 * Waiting Lobby Page - Dynamic Route
 *
 * URL: /room/[code]/lobby
 * Server-side loads room data, client polls for updates
 */

import { WaitingLobby } from "@/components/WaitingLobby";
import { loadGameRoom } from "@/lib/actions/game-room";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ isHost?: string }>;
}

export default async function LobbyPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { isHost } = await searchParams;

  // Load room from database
  const result = await loadGameRoom(code);

  if (result.error || !result.room) {
    // Room not found, redirect to home
    redirect("/");
  }

  return (
    <WaitingLobby
      roomCode={code}
      isHost={isHost === "true"}
      initialRoom={result.room}
    />
  );
}
