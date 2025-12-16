import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),

  // Trust the host header from Vercel/proxy
  trustedOrigins: [
    "http://localhost:3000",
    "https://bloqueio-mvp.vercel.app",
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can enable later
  },

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      enabled: !!(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ),
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      enabled: !!(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    },
  },

  // Custom user fields for game stats
  user: {
    additionalFields: {
      gamesPlayed: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false, // Don't allow user to set this
      },
      gamesWon: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },
});

export type Auth = typeof auth;
