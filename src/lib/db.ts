/**
 * Database Client Wrapper
 *
 * Provides a unified SQL interface that works in both:
 * - Local development (Docker Postgres via postgres.js)
 * - Production (Neon via @neondatabase/serverless)
 *
 * Usage:
 *   import { sql } from '@/lib/db';
 *   const rooms = await sql`SELECT * FROM game_rooms`;
 */

import postgres from "postgres";
import { neon } from "@neondatabase/serverless";

/**
 * Determine which SQL client to use based on environment
 *
 * - Local development: Use postgres.js (works with Docker Postgres)
 * - Vercel Edge/Serverless: Use Neon serverless driver
 */
const isProduction = process.env.VERCEL_ENV === "production";
const isVercel = process.env.VERCEL === "1";

/**
 * SQL client - auto-selects based on environment
 *
 * In development: postgres.js connects to local Docker Postgres
 * In production: Neon serverless driver connects to Neon database
 */
export const sql =
  isVercel && isProduction
    ? neon(process.env.DATABASE_URL!)
    : postgres(process.env.DATABASE_URL!, {
        // Local development options
        max: 10, // Connection pool size
        idle_timeout: 20, // Close idle connections after 20s
        connect_timeout: 10, // Timeout after 10s if can't connect
      });

/**
 * Type-safe query helpers
 */

/** Check database connection */
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

/**
 * Close database connection (only needed for postgres.js in local dev)
 * No-op for Neon serverless driver
 */
export async function closeConnection(): Promise<void> {
  if (!isVercel && "end" in sql) {
    await (sql as postgres.Sql).end();
  }
}
