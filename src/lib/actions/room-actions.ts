"use server";

import { db } from "@/lib/db";
import { getOrCreateSessionId, getGuestName } from "@/lib/session";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import type { GoalSide, PlayerType } from "@prisma/client";
import { getGameModeConfig, type GameMode } from "@/types/game";
import crypto from "crypto";

type PlayerSlotConfig =
  | "EMPTY"
  | "HUMAN"
  | "BOT_EASY"
  | "BOT_MEDIUM"
  | "BOT_HARD";

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
 *
 * @param gameMode - TWO_PLAYER or FOUR_PLAYER
 * @param playerSlots - Optional array defining which slots are bots/humans (host is always HUMAN at index 0)
 */
export async function createRoom(
  gameMode: GameMode = "FOUR_PLAYER",
  playerSlots?: PlayerSlotConfig[]
): Promise<{ code: string; playerId: number } | { error: string }> {
  try {
    // Validate gameMode
    if (gameMode !== "TWO_PLAYER" && gameMode !== "FOUR_PLAYER") {
      return { error: "Invalid game mode" };
    }

    const sessionId = await getOrCreateSessionId();

    // Get current user from Better Auth (if logged in)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Get guest name from cookie (for non-authenticated users)
    const guestName = await getGuestName();

    // Generate unique room code
    let code = generateRoomCode();
    let existing = await db.room.findUnique({ where: { code } });

    // Retry if code collision (very unlikely)
    while (existing) {
      code = generateRoomCode();
      existing = await db.room.findUnique({ where: { code } });
    }

    const config = PLAYER_CONFIGS[0]; // Host is always player 0

    // Determine player name: auth user name > guest name > default
    const playerName = session?.user?.name || guestName || config.name;

    const modeConfig = getGameModeConfig(gameMode);
    const hasBots =
      playerSlots &&
      playerSlots.some(
        (slot) =>
          slot === "BOT_EASY" || slot === "BOT_MEDIUM" || slot === "BOT_HARD"
      );

    // Build initial players array
    const playersToCreate = [];

    // Always create host as player 0
    playersToCreate.push({
      playerId: 0,
      sessionId,
      userId: session?.user?.id || null,
      name: playerName,
      color: config.color,
      row: config.row,
      col: config.col,
      goalSide: config.goalSide,
      wallsLeft: modeConfig.wallsPerPlayer,
      playerType: "HUMAN" as PlayerType,
    });

    // Create bot players if specified
    if (playerSlots && hasBots) {
      for (
        let i = 1;
        i < playerSlots.length && i < modeConfig.maxPlayers;
        i++
      ) {
        const slotType = playerSlots[i];

        // Skip empty slots
        if (slotType === "EMPTY") continue;

        // Skip HUMAN slots (they'll join later)
        if (slotType === "HUMAN") continue;

        // Create bot player
        if (
          slotType === "BOT_EASY" ||
          slotType === "BOT_MEDIUM" ||
          slotType === "BOT_HARD"
        ) {
          const botConfig = PLAYER_CONFIGS[i];
          playersToCreate.push({
            playerId: i,
            sessionId: null, // Bots don't have sessions
            userId: null,
            name: `Bot ${i + 1}`,
            color: botConfig.color,
            row: botConfig.row,
            col: botConfig.col,
            goalSide: botConfig.goalSide,
            wallsLeft: modeConfig.wallsPerPlayer,
            playerType: slotType as PlayerType, // BOT_EASY, BOT_MEDIUM, or BOT_HARD
          });
        }
      }
    }

    // Create room + initial players in transaction
    const room = await db.room.create({
      data: {
        code,
        gameMode,
        hostSessionId: sessionId,
        botSeed: crypto.randomUUID(), // Deterministic RNG seed for bot reproducibility
        turnNumber: 0, // Initialize concurrency control
        allowBots: hasBots, // Enable bots if any are configured
        players: {
          create: playersToCreate,
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

    // Get guest name from cookie (for non-authenticated users)
    const guestName = await getGuestName();

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

    if (!room) return { error: "Sala não encontrada" };

    const config = getGameModeConfig(room.gameMode as GameMode);

    // Check player limit based on game mode
    if (room.players.length >= config.maxPlayers) {
      return {
        error:
          room.gameMode === "TWO_PLAYER"
            ? "Sala cheia (2/2 jogadores)"
            : "Sala cheia (4/4 jogadores)",
      };
    }

    if (room.status !== "WAITING") return { error: "Jogo já iniciado" };

    // Check if user already joined (if authenticated)
    if (session?.user?.id) {
      const userPlayer = await db.player.findFirst({
        where: { userId: session.user.id, roomId: room.id },
      });
      if (userPlayer) {
        return { error: "Você já está nesta sala" };
      }
    }

    // Find next available player slot based on game mode
    const takenIds = new Set(room.players.map((p) => p.playerId));
    const availableSlots = config.playerSlots.filter(
      (id: number) => !takenIds.has(id)
    );

    if (availableSlots.length === 0) {
      return { error: "Sala cheia" };
    }

    const nextId = availableSlots[0];
    const playerConfig = PLAYER_CONFIGS[nextId];

    // Determine player name: auth user name > guest name > default
    const playerName = session?.user?.name || guestName || playerConfig.name;

    // Create player with correct wallsLeft based on game mode
    await db.player.create({
      data: {
        roomId: room.id,
        playerId: nextId,
        sessionId,
        userId: session?.user?.id || null,
        name: playerName,
        color: playerConfig.color,
        row: playerConfig.row,
        col: playerConfig.col,
        goalSide: playerConfig.goalSide,
        wallsLeft: config.wallsPerPlayer, // Dynamic based on game mode
      },
    });

    return { playerId: nextId };
  } catch (error) {
    console.error("Error joining room:", error);
    return { error: "Falha ao entrar na sala" };
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
