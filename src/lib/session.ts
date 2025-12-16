import { cookies } from "next/headers";
import { randomBytes } from "crypto";

/**
 * Get or create a session ID for the current request
 * 
 * This is used for guest players (non-authenticated users).
 * Authenticated users will use Better Auth sessions via userId.
 * 
 * @returns Session ID string
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("game_session_id")?.value;

  if (!sessionId) {
    sessionId = randomBytes(32).toString("hex");
    cookieStore.set("game_session_id", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  return sessionId;
}

/**
 * Get current session ID without creating one
 * 
 * @returns Session ID or null if none exists
 */
export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("game_session_id")?.value || null;
}
