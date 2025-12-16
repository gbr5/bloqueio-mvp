/**
 * Polling Configuration
 *
 * Centralized polling intervals for real-time updates.
 * Adjust these to balance responsiveness vs re-render frequency.
 */

export const POLLING_INTERVALS = {
  /**
   * Lobby polling - waiting for players to join
   * Lower frequency is fine since joining is infrequent
   */
  LOBBY: 15000, // 15 seconds

  /**
   * Game polling - active gameplay
   * Only polls when waiting for opponent's turn
   */
  GAME_RECENT_ACTIVITY: 10000, // 10s - recent move (< 10s ago)
  GAME_NORMAL: 10000, // 10s - moderate activity (< 1min ago)
  GAME_IDLE: 10000, // 10s   - idle game (< 5min ago)

  /**
   * Thresholds for adaptive polling
   */
  RECENT_ACTIVITY_THRESHOLD: 10_000, // 10 seconds
  NORMAL_ACTIVITY_THRESHOLD: 60_000, // 1 minute
  IDLE_THRESHOLD: 300_000, // 5 minutes
} as const;

/**
 * Helper to calculate adaptive polling interval based on last activity
 */
export function getAdaptiveInterval(
  lastUpdateTimestamp: number
): number | null {
  const timeSinceUpdate = Date.now() - lastUpdateTimestamp;

  // Recent activity: Fast polling
  if (timeSinceUpdate < POLLING_INTERVALS.RECENT_ACTIVITY_THRESHOLD) {
    return POLLING_INTERVALS.GAME_RECENT_ACTIVITY;
  }

  // Moderate activity: Normal polling
  if (timeSinceUpdate < POLLING_INTERVALS.NORMAL_ACTIVITY_THRESHOLD) {
    return POLLING_INTERVALS.GAME_NORMAL;
  }

  // Idle: Slow polling
  if (timeSinceUpdate < POLLING_INTERVALS.IDLE_THRESHOLD) {
    return POLLING_INTERVALS.GAME_IDLE;
  }

  // Very idle: Stop polling
  return null;
}
