"use server";

import { setGuestName } from "@/lib/session";

/**
 * Server action to set guest name cookie
 */
export async function setGuestNameAction(name: string): Promise<void> {
  // Validate name
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 20) {
    throw new Error("Invalid name");
  }

  await setGuestName(trimmed);
}
