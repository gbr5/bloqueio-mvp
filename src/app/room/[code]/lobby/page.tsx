/**
 * Waiting Lobby Page - Dynamic Route
 *
 * URL: /room/[code]/lobby
 * Client polls for updates via getRoomState()
 */

import { WaitingLobby } from "@/components/WaitingLobby";
import { getRoomState } from "@/lib/actions/room-actions";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function LobbyPage({ params }: PageProps) {
  const { code } = await params;

  // Verify room exists
  const result = await getRoomState(code);

  if (result.error || !result.room) {
    redirect("/");
  }

  return <WaitingLobby roomCode={code} />;
}
