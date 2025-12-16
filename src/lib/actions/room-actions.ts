"use server";

import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { GoalSide, BarrierOrientation } from "@prisma/client";

/**
 * Generate a random 6-character room code (uppercase letters and numbers)
 */
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Player configuration constants
 */
const PLAYER_CONFIGS = [
  {
    name: "Player 1",
    color: "#ef4444",
    row: 5,
    col: 1, // First cell AFTER left border
    goalSide: "RIGHT" as GoalSide,
  },
  {
    name: "Player 2",
    color: "#3b82f6",
    row: 1, // First cell AFTER top border
    col: 5,
    goalSide: "BOTTOM" as GoalSide,
  },
  {
    name: "Player 3",
    color: "#22c55e",
    row: 5,
    col: 9, // First cell AFTER right border
    goalSide: "LEFT" as GoalSide,
  },
  {
    name: "Player 4",
    color: "#f59e0b",
    row: 9, // First cell AFTER bottom border
    col: 5,
    goalSide: "TOP" as GoalSide,
  },
];

/**
 * Create a new game room
 * Returns room code and player ID (host is always player 0)
 */
export async function createRoom(): Promise<
  { code: string; playerId: number } | { error: string }
> {
  try {
    const sessionId = await getOrCreateSessionId();

    // Get current user from Better Auth (if logged in)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Generate unique room code
    let code = generateRoomCode();
    let existing = await db.room.findUnique({ where: { code } });

    // Retry if code collision (very unlikely)
    while (existing) {
      code = generateRoomCode();
      existing = await db.room.findUnique({ where: { code } });
    }

    const config = PLAYER_CONFIGS[0]; // Host is always player 0

    // Create room + host player in transaction
    const room = await db.room.create({
      data: {
        code,
        hostId: sessionId,
        players: {
          create: {
            playerId: 0,
            sessionId,
            userId: session?.user?.id || null,
            name: session?.user?.name || config.name,
            color: config.color,
            row: config.row,
            col: config.col,
            goalSide: config.goalSide,
          },
        },
      },
    });

    return { code: room.code, playerId: 0 };
  } catch (error) {
    console.error("Error creating room:", error);
    return { error: "Failed to create room" };
  }
}

/**
 * Join an existing room
 * Auto-assigns next available player slot (0-3)
 */
export async function joinRoom(
  code: string
): Promise<{ playerId: number } | { error: string }> {
  try {
    const sessionId = await getOrCreateSessionId();

    // Get current user from Better Auth (if logged in)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Check if already in this room
    const existing = await db.player.findFirst({
      where: { sessionId, room: { code } },
    });

    if (existing) {
      return { playerId: existing.playerId };
    }

    // Find room and check capacity
    const room = await db.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room) return { error: "Room not found" };
    if (room.players.length >= 4) return { error: "Room is full" };
    if (room.status !== "WAITING") return { error: "Game already started" };

    // Check if user already joined (if authenticated)
    if (session?.user?.id) {
      const userPlayer = await db.player.findFirst({
        where: { userId: session.user.id, roomId: room.id },
      });
      if (userPlayer) {
        return { error: "You already joined this room" };
      }
    }

    // Find next available player slot
    const takenIds = new Set(room.players.map((p) => p.playerId));
    const nextId = [0, 1, 2, 3].find((id) => !takenIds.has(id));

    if (nextId === undefined) {
      return { error: "Room is full" };
    }

    const config = PLAYER_CONFIGS[nextId];

    // Create player
    await db.player.create({
      data: {
        roomId: room.id,
        playerId: nextId,
        sessionId,
        userId: session?.user?.id || null,
        name: session?.user?.name || config.name,
        color: config.color,
        row: config.row,
        col: config.col,
        goalSide: config.goalSide,
      },
    });

    return { playerId: nextId };
  } catch (error) {
    console.error("Error joining room:", error);
    return { error: "Failed to join room" };
  }
}

/**
 * Get current room state for polling
 */
export async function getRoomState(code: string) {
  try {
    const sessionId = await getOrCreateSessionId();

    const room = await db.room.findUnique({
      where: { code },
      include: {
        players: {
          orderBy: { playerId: "asc" },
        },
        barriers: true,
      },
    });

    if (!room) return { error: "Room not found" };

    const myPlayer = room.players.find((p) => p.sessionId === sessionId);

    return {
      room,
      myPlayerId: myPlayer?.playerId ?? null,
      isMyTurn: myPlayer?.playerId === room.currentTurn,
    };
  } catch (error) {
    console.error("Error getting room state:", error);
    return { error: "Failed to get room state" };
  }
}
