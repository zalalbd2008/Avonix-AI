import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { conversations } from "./conversations";

export const messageAuthorEnum = pgEnum("message_author", [
  "visitor",
  "ai",
  "agent",
  "system",
]);

/**
 * Whether this message reached the person outside.
 *
 * `not_applicable` is the common case: anything the visitor sent us, and any
 * agent reply on a thread with no address to send to. Without this column an
 * agent has no way to tell a delivered reply from one that bounced, which is
 * exactly the ambiguity that makes people distrust an inbox.
 */
export const messageDeliveryEnum = pgEnum("message_delivery", [
  "not_applicable",
  "pending",
  "sent",
  "failed",
]);

export const messages = pgTable(
  "messages",
  {
    ...primaryId,
    agencyId: agencyId(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),

    author: messageAuthorEnum("author").notNull(),
    body: text("body").notNull(),

    delivery: messageDeliveryEnum("delivery").notNull().default("not_applicable"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    /** Provider message id, for tracing a specific send in their dashboard. */
    deliveryRef: text("delivery_ref"),
    /** Why it failed, shown to the agent verbatim — a vague failure is unactionable. */
    deliveryError: text("delivery_error"),

    /** Populated for `ai` messages so cost is attributable per conversation. */
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cachedInputTokens: integer("cached_input_tokens"),

    ...timestamps,
  },
  (t) => [
    index("messages_agency_idx").on(t.agencyId),
    index("messages_conversation_idx").on(t.conversationId, t.createdAt),
  ],
);

export type Message = typeof messages.$inferSelect;
