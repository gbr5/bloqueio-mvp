"use client";

import { createAuthClient } from "better-auth/react";

// Use relative URL - browser will automatically use current origin
// This works for both localhost and production without env vars
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
});

export const { signIn, signUp, signOut, useSession } = authClient;
