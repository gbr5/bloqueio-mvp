"use server";

import { db } from "@/lib/db";

export interface LeaderboardEntry {
  id: string;
  name: string;
  image: string | null;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
}

/**
 * Get top players by wins
 */
export async function getLeaderboard(
  limit: number = 10
): Promise<{ leaderboard: LeaderboardEntry[] } | { error: string }> {
  try {
    const users = await db.user.findMany({
      where: {
        gamesPlayed: { gt: 0 }, // Only users who have played at least one game
      },
      orderBy: [
        { gamesWon: "desc" },
        { gamesPlayed: "asc" }, // Fewer games with same wins = better
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        image: true,
        gamesPlayed: true,
        gamesWon: true,
      },
    });

    const leaderboard: LeaderboardEntry[] = users.map((user) => ({
      ...user,
      winRate:
        user.gamesPlayed > 0
          ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
          : 0,
    }));

    return { leaderboard };
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return { error: "Failed to fetch leaderboard" };
  }
}

/**
 * Get a specific user's stats
 */
export async function getUserStats(
  userId: string
): Promise<{ stats: LeaderboardEntry; rank: number } | { error: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        gamesPlayed: true,
        gamesWon: true,
      },
    });

    if (!user) {
      return { error: "User not found" };
    }

    // Calculate rank (how many users have more wins)
    const usersWithMoreWins = await db.user.count({
      where: {
        OR: [
          { gamesWon: { gt: user.gamesWon } },
          {
            gamesWon: user.gamesWon,
            gamesPlayed: { lt: user.gamesPlayed },
          },
        ],
      },
    });

    const stats: LeaderboardEntry = {
      ...user,
      winRate:
        user.gamesPlayed > 0
          ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
          : 0,
    };

    return {
      stats,
      rank: usersWithMoreWins + 1,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return { error: "Failed to fetch user stats" };
  }
}
