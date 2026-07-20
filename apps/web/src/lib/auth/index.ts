import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { resetPasswordEmail } from "@/lib/email/templates/reset-password";
import { verifyEmail } from "@/lib/email/templates/verify-email";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,

    // Sign-in is allowed before the address is confirmed. Blocking it would
    // strand anyone whose verification mail is delayed, and the address is
    // confirmed by the reminder in the app instead.
    requireEmailVerification: false,

    async sendResetPassword({ user, url }) {
      await sendEmail(
        resetPasswordEmail({ to: user.email, name: user.name, url }),
      );
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendEmail(verifyEmail({ to: user.email, name: user.name, url }));
    },
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
