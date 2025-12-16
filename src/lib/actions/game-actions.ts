"use server";

import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import type { BarrierOrientation, GoalSide } from "@prisma/client";

/**
 * Check if a player has reached their goal
 */
function checkWin(goalSide: GoalSide, row: number, col: number): boolean {
  switch (goalSide) {
    case "TOP":
      return row === 0;
    case "RIGHT":
      return col === 10;
    case "BOTTOM":
      return row === 10;
    case "LEFT":
      return col === 0;
    default:
      return false;
  }
}

/**
 * Make a move (pawn movement)
 * Server validates turn order, move legality, and win conditions
 */
export async function makeMove(
  code: string,
  toRow: number,
  toCol: number
): Promise<{ success: true } | { error: string }> {
  try {
    const sessionId = await getOrCreateSessionId();

    // Get player
    const player = await db.player.findFirst({
      where: { sessionId, room: { code } },
    });

    if (!player) return { error: "Not in this room" };

    // Get room with all data
    const room = await db.room.findUnique({
      where: { code },
      include: { players: true, barriers: true },
    });

    if (!room) return { error: "Room not found" };
    if (room.status !== "PLAYING") {
      return { error: "Game not started" };
    }
    if (room.currentTurn !== player.playerId) {
      return { error: "Not your turn" };
    }

    // TODO: Add move validation logic here
    // For now, we'll allow any move (will add proper validation later)

    // Check win condition
    const isWin = checkWin(player.goalSide, toRow, toCol);

    // Update in transaction
    await db.$transaction([
      // Update player position
      db.player.update({
        where: { id: player.id },
        data: { row: toRow, col: toCol },
      }),

      // Record move in history
      db.move.create({
        data: {
          roomId: room.id,
          playerId: player.playerId,
          fromRow: player.row,
          fromCol: player.col,
          toRow,
          toCol,
        },
      }),

      // Update room state
      db.room.update({
        where: { id: room.id },
        data: {
          currentTurn: isWin
            ? room.currentTurn
            : (room.currentTurn + 1) % room.players.length,
          winner: isWin ? player.playerId : room.winner,
          status: isWin ? "FINISHED" : room.status,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error making move:", error);
    return { error: "Failed to make move" };
  }
}

/**
 * Place a barrier on the board
 */
export async function placeBarrier(
  code: string,
  row: number,
  col: number,
  orientation: "HORIZONTAL" | "VERTICAL"
): Promise<{ success: true } | { error: string }> {
  try {
    const sessionId = await getOrCreateSessionId();

    // Get player
    const player = await db.player.findFirst({
      where: { sessionId, room: { code } },
    });

    if (!player) return { error: "Not in this room" };
    if (player.wallsLeft === 0) return { error: "No walls left" };

    // Get room
    const room = await db.room.findUnique({
      where: { code },
      include: { players: true, barriers: true },
    });

    if (!room) return { error: "Room not found" };
    if (room.status !== "PLAYING") {
      return { error: "Game not started" };
    }
    if (room.currentTurn !== player.playerId) {
      return { error: "Not your turn" };
    }

    // Validate barrier placement
    // 1. Cannot place on border cells (row/col 0 or 10 for 11x11 grid)
    const GRID_SIZE = 11;
    if (row === 0 || row >= GRID_SIZE - 2 || col === 0 || col >= GRID_SIZE - 2) {
      return { error: "Cannot place barriers on border cells" };
    }

    // 2. Check if barrier overlaps with existing barriers
    const overlaps = room.barriers.some(
      (b) => b.row === row && b.col === col && b.orientation === orientation
    );
    if (overlaps) {
      return { error: "Barrier already exists at this position" };
    }

    // TODO: Add pathfinding validation to ensure no player is completely blocked

    // Place barrier in transaction
    await db.$transaction([
      db.barrier.create({
        data: {
          roomId: room.id,
          row,
          col,
          orientation,
          placedBy: player.playerId,
        },
      }),

      db.player.update({
        where: { id: player.id },
        data: { wallsLeft: player.wallsLeft - 1 },
      }),

      db.room.update({
        where: { id: room.id },
        data: {
          currentTurn: (room.currentTurn + 1) % room.players.length,
        },
      }),
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error placing barrier:", error);
    return { error: "Failed to place barrier" };
  }
}

/**
 * Start the game (change status from WAITING to PLAYING)
 */
export async function startGame(
  code: string
): Promise<{ success: true } | { error: string }> {
  try {
    const sessionId = await getOrCreateSessionId();

    const room = await db.room.findUnique({
      where: { code },
      include: { players: true },
    });

    if (!room) return { error: "Room not found" };
    if (room.hostId !== sessionId) {
      return { error: "Only host can start the game" };
    }
    if (room.players.length < 2) {
      return { error: "Need at least 2 players to start" };
    }
    if (room.status !== "WAITING") {
      return { error: "Game already started" };
    }

    await db.room.update({
      where: { id: room.id },
      data: { status: "PLAYING" },
    });

    return { success: true };
  } catch (error) {
    console.error("Error starting game:", error);
    return { error: "Failed to start game" };
  }
}
