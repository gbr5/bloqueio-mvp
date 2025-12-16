import { cookies } from "next/headers";
import { randomBytes } from "crypto";

const GUEST_NAME_COOKIE = "guest_name";

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

/**
 * Get guest name from cookie (server-side)
 *
 * @returns Guest name or null if not set
 */
export async function getGuestName(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(GUEST_NAME_COOKIE)?.value || null;
}

/**
 * Set guest name cookie (server action)
 */
export async function setGuestName(name: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_NAME_COOKIE, name, {
    httpOnly: false, // Accessible from client for display purposes
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
