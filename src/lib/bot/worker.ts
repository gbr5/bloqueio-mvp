/**
 * Bot Move Worker Loop
 * Server-side background process that executes pending bot moves
 * Runs continuously (polling every 1-2s) or via cron job
 */

import { db } from "@/lib/db";
import { BotEngine } from "./engine";

/**
 * Poll and process pending bot move jobs
 * Call this on an interval (1-2s) or via cron job
 * Safe to call multiple times concurrently (DB constraints prevent duplicates)
 */
export async function processPendingBotJobs(): Promise<{ processed: number; failed: number }> {
  const pendingJobs = await db.botMoveJob.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 10, // Process up to 10 jobs per tick
  });

  let processed = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    try {
      await processSingleBotJob(job.id);
      processed++;
    } catch (error) {
      console.error(`Failed to process bot job ${job.id}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Process single bot move job with full idempotency + timeout
 * CANONICAL IMPLEMENTATION matching analysis
 */
async function processSingleBotJob(jobId: string): Promise<void> {
  // Mark as RUNNING
  const job = await db.botMoveJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  try {
    // Load room state
    const room = await db.room.findUnique({
      where: { code: job.code },
      include: { players: true },
    });

    if (!room) {
      await db.botMoveJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: "Room not found",
          completedAt: new Date(),
        },
      });
      return;
    }

    // IDEMPOTENCY CHECK: skip if turn has advanced
    if (room.turnNumber !== job.expectedTurn) {
      await db.botMoveJob.update({
        where: { id: jobId },
        data: {
          status: "STALE",
          error: `Turn mismatch: expected ${job.expectedTurn}, got ${room.turnNumber}`,
          completedAt: new Date(),
        },
      });
      return;
    }

    // SAFETY CHECK: verify it's actually this bot's turn
    if (room.currentTurn !== job.playerId) {
      await db.botMoveJob.update({
        where: { id: jobId },
        data: {
          status: "STALE",
          error: `Not this bot's turn (expected ${job.playerId}, got ${room.currentTurn})`,
          completedAt: new Date(),
        },
      });
      return;
    }

    // Execute bot move with 5s hard timeout
    const startTime = Date.now();
    const engine = new BotEngine(room.botSeed || "default");

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Bot move timeout (>5s)")), 5000);
    });

    try {
      await Promise.race([
        engine.executeBotMove(job.code, job.playerId),
        timeoutPromise,
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes("timeout")) {
        throw new Error("Bot move exceeded 5 second limit");
      }
      throw error;
    }

    const computeTime = Date.now() - startTime;

    // Mark as completed
    await db.botMoveJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Log performance warning if approaching 5s
    if (computeTime > 4000) {
      console.warn(
        `⚠️ Bot move took ${computeTime}ms (close to 5s limit): room=${job.code}, player=${job.playerId}`
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await db.botMoveJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    console.error(
      `❌ Bot job failed (${job.code}, player ${job.playerId}):`,
      errorMessage
    );
  }
}

/**
 * Start worker loop (for production deployment)
 * Can be called in:
 * 1. Next.js API route (run on every request)
 * 2. Scheduled job (e.g., via Vercel Cron)
 * 3. Separate worker process
 */
export async function startWorkerLoop(intervalMs: number = 1000): Promise<() => void> {
  console.log(`🤖 Bot worker loop started (polling every ${intervalMs}ms)`);

  const intervalId = setInterval(async () => {
    try {
      const result = await processPendingBotJobs();
      if (result.processed > 0 || result.failed > 0) {
        console.log(
          `📊 Bot worker: processed ${result.processed}, failed ${result.failed}`
        );
      }
    } catch (error) {
      console.error("💥 Worker loop error:", error);
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log("🛑 Bot worker loop stopped");
  };
}

/**
 * For testing: process all jobs synchronously
 */
export async function processAllBotJobsSync(): Promise<void> {
  let hasMore = true;
  while (hasMore) {
    const result = await processPendingBotJobs();
    hasMore = result.processed > 0;
  }
}
