/**
 * Prisma Database Client
 *
 * Provides type-safe database access using Prisma ORM
 * Works with both local and production Neon PostgreSQL
 *
 * Usage:
 *   import { db } from '@/lib/db';
 *   const rooms = await db.room.findMany();
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Type-safe query helpers
 */

/** Check database connection */
export async function testConnection(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

/**
 * Close database connection
 */
export async function closeConnection(): Promise<void> {
  await db.$disconnect();
}
