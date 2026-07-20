import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencies } from "./agencies";
import { conversations } from "./conversations";

/**
 * Routes an emailed reply back to its thread.
 *
 * DELIBERATELY NOT TENANT-SCOPED. This is the third table in the codebase whose
 * whole job is to answer "which tenant is this?" before a tenant is known:
 *
 *   memberships      a signed-in user  -> agency   (lib/auth/session.ts)
 *   connector_keys   a plugin's key    -> agency   (lib/connector/auth.ts)
 *   reply_tokens     an inbound email  -> agency   (lib/crm/inbound.ts)
 *
 * Each one exists because the obvious place to put the identifier — on `user`,
 * on `websites`, on `conversations` — is tenant-scoped, so looking it up with no
 * tenant set matches zero rows under RLS and every valid credential is rejected
 * as invalid. I have now made that mistake four times. If a fourth lookup of
 * this kind is ever needed, it belongs here as a sibling, not as a column on a
 * scoped table.
 *
 * The token is a bearer credential for one thread: 128 bits, never displayed.
 */
export const replyTokens = pgTable(
  "reply_tokens",
  {
    ...primaryId,
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    token: text("token").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("reply_tokens_token_key").on(t.token),
    index("reply_tokens_conversation_idx").on(t.conversationId),
  ],
);

export type ReplyToken = typeof replyTokens.$inferSelect;
