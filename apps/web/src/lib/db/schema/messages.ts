import { index, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { conversations } from "./conversations";

export const messageAuthorEnum = pgEnum("message_author", [
  "visitor",
  "ai",
  "agent",
  "system",
]);

export const messages = pgTable(
  "messages",
  {
    ...primaryId,
    agencyId: agencyId(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),

    author: messageAuthorEnum("author").notNull(),
    body: text("body").notNull(),

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
