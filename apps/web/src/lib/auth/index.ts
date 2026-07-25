import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { validateSignupEmail } from "@/lib/email/email-policy";
import { resetPasswordEmail } from "@/lib/email/templates/reset-password";
import { verifyEmail } from "@/lib/email/templates/verify-email";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Identity, per ADR-004: bought rather than built, but self-hosted — the tables
 * live in our own Postgres, so there is no per-seat bill and no third party
 * holding the user list.
 *
 * Better Auth owns *identity* (who you are). It does not own *tenancy* — which
 * agency you are acting as is `memberships`, resolved in `session.ts`.
 *
 * Email must be valid + non-disposable at signup, and verified before the
 * account can sign in or finish onboarding.
 */
export const auth = betterAuth({
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const check = validateSignupEmail(user.email ?? "");
          if (!check.ok) {
            throw new APIError("BAD_REQUEST", { message: check.error });
          }
          // Public registration must never mint a Platform Owner (ADR-012).
          // platform_accounts rows are only created by platform CLI (bootstrap / add-owner).
          return { data: { ...user, email: check.email } };
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    /** No session / sign-in until the address is confirmed. */
    requireEmailVerification: true,

    async sendResetPassword({ user, url }) {
      await sendEmail(
        resetPasswordEmail({ to: user.email, name: user.name, url }),
      );
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendEmail(verifyEmail({ to: user.email, name: user.name, url }));
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh the row at most daily
    // cookieCache serializes the full user row (incl. base64 brand logo in
    // `image`) into cookies → HTTP 431 Request Header Fields Too Large after
    // sign-in. Keep sessions in the DB only.
    cookieCache: {
      enabled: false,
    },
  },

  // Must be last — writes Set-Cookie through Next's cookie API.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
