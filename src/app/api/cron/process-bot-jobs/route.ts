import { NextResponse } from "next/server";
import { processPendingBotJobs } from "@/lib/bot/worker";

/**
 * API route for processing bot jobs
 * Can be triggered by:
 * 1. Vercel Cron (recommended for production)
 * 2. Manual HTTP call during development
 * 3. External cron service
 *
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/process-bot-jobs",
 *     "schedule": "* * * * *"
 *   }]
 * }
 */
export async function GET(request: Request) {
  try {
    // Optional: Add authorization check in production
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    console.log("[Bot Worker] Processing bot jobs...");
    const result = await processPendingBotJobs();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Bot Worker] Error processing jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// For development: also support POST
export const POST = GET;
