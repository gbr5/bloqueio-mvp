/**
 * Leaderboard Component
 *
 * Displays top players ranked by wins.
 */

"use client";

import { useState, useEffect } from "react";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/actions/leaderboard-actions";

interface LeaderboardProps {
  limit?: number;
}

export function Leaderboard({ limit = 5 }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLeaderboard = async () => {
      const result = await getLeaderboard(limit);

      if ("error" in result) {
        setError(result.error);
      } else {
        setEntries(result.leaderboard);
      }
      setLoading(false);
    };

    loadLeaderboard();
  }, [limit]);

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <span>Leaderboard</span>
        </h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-10 bg-slate-700/50 rounded animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Leaderboard</h3>
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Leaderboard</h3>
        <p className="text-slate-400 text-sm text-center py-4">
          No games played yet. Be the first!
        </p>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-yellow-400 text-lg">1st</span>;
      case 2:
        return <span className="text-slate-300 text-lg">2nd</span>;
      case 3:
        return <span className="text-amber-600 text-lg">3rd</span>;
      default:
        return <span className="text-slate-500">{rank}th</span>;
    }
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <span>Leaderboard</span>
      </h3>
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-2 rounded ${
              index === 0
                ? "bg-yellow-900/20 border border-yellow-700/50"
                : "bg-slate-900/30"
            }`}
          >
            <div className="w-8 text-center shrink-0">
              {getRankIcon(index + 1)}
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-600 shrink-0 overflow-hidden">
              {entry.image ? (
                <img
                  src={entry.image}
                  alt={entry.name || "Player"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                  {(entry.name || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {entry.name || "Anonymous"}
              </p>
              <p className="text-slate-400 text-xs">
                {entry.gamesWon}W / {entry.gamesPlayed}G ({entry.winRate}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
