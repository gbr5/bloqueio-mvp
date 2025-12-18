/**
 * Bot Move Scheduler
 * Server-driven orchestration - NEVER called from client
 * Only called from afterMoveCommit() hooks
 */

import { db } from "@/lib/db";

/**
 * Schedule a bot move job after successful move commit
 * CANONICAL IMPLEMENTATION - matches analysis exactly
 *
 * @param roomCode - Room code (not roomId)
 * @param playerId - Bot player ID (0-3)
 * @param expectedTurn - Current turn number (job is stale if room.turnNumber != this)
 */
export async function scheduleBotMove(
  roomCode: string,
  playerId: number,
  expectedTurn: number
): Promise<void> {
  // Use unique constraint to prevent duplicate jobs
  // If job already exists with same (roomCode, playerId, expectedTurn), skip creation
  await db.botMoveJob.upsert({
    where: {
      code_playerId_expectedTurn: {
        code: roomCode,
        playerId,
        expectedTurn,
      },
    },
    create: {
      code: roomCode,
      playerId,
      expectedTurn,
      status: "PENDING",
    },
    update: {}, // No-op if already exists (idempotent)
  });
}

/**
 * Hook called after every successful move commit
 * Checks if next player is a bot, schedules job if needed
 */
export async function afterMoveCommit(roomCode: string): Promise<void> {
  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room) return;

  // Get current player
  const currentPlayer = room.players.find(
    (p) => p.playerId === room.currentTurn
  );
  if (!currentPlayer) return;

  // Only schedule if bot and not already scheduled
  if (currentPlayer.playerType !== "HUMAN") {
    await scheduleBotMove(roomCode, room.currentTurn, room.turnNumber);

    // IMMEDIATE BOT RESPONSE: Process the job right away instead of waiting for cron
    const { processPendingBotJobs } = await import("@/lib/bot/worker");
    // Process in background (don't await to avoid blocking the response)
    processPendingBotJobs().catch((err) =>
      console.error("[Bot] Error processing immediate bot move:", err)
    );
  }
}

/**
 * Hook called when game starts (all slots filled)
 * If first player is bot, schedule immediately
 */
export async function onGameStart(roomCode: string): Promise<void> {
  const room = await db.room.findUnique({
    where: { code: roomCode },
    include: { players: true },
  });

  if (!room) return;

  // If starting player is bot, schedule job and process immediately
  const startingPlayer = room.players.find(
    (p) => p.playerId === room.currentTurn
  );
  if (startingPlayer && startingPlayer.playerType !== "HUMAN") {
    await scheduleBotMove(roomCode, room.currentTurn, room.turnNumber);

    // IMMEDIATE BOT RESPONSE: Process the job right away
    const { processPendingBotJobs } = await import("@/lib/bot/worker");
    processPendingBotJobs().catch((err) =>
      console.error(
        "[Bot] Error processing immediate bot move on game start:",
        err
      )
    );
  }
}
