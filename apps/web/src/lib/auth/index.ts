import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

/**
 * Identity, per ADR-004: bought rather than built, but self-hosted — the tables
 * live in our own Postgres, so there is no per-seat bill and no third party
 * holding the user list. `02-Platform/Authentication/`'s fifteen files of
 * password policy, MFA, sessions and devices are this library's problem now.
 *
 * Better Auth owns *identity* (who you are). It does not own *tenancy* — which
 * agency you are acting as is `memberships`, resolved in `session.ts`.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    // Turn on once an email sender exists. Leaving it false in development
    // means the signup flow completes without a mailbox.
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the row at most daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },

  // Must be last — writes Set-Cookie through Next's cookie API.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
