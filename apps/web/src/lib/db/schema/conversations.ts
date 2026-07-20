import { index, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { websites } from "./websites";

export const conversationChannelEnum = pgEnum("conversation_channel", [
  "chat",
  "form",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "open",
  "snoozed",
  "closed",
]);

/** One thread in the unified inbox. Scoped to the Client. */
export const conversations = pgTable(
  "conversations",
  {
    ...primaryId,
    agencyId: agencyId(),
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    websiteId: uuid("website_id").references(() => websites.id, { onDelete: "set null" }),

    channel: conversationChannelEnum("channel").notNull(),
    status: conversationStatusEnum("status").notNull().default("open"),

    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    /** Null means nobody on the agency side has replied yet — drives "unworked". */
    firstHumanReplyAt: timestamp("first_human_reply_at", { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    index("conversations_agency_idx").on(t.agencyId),
    index("conversations_client_status_idx").on(t.clientId, t.status),
    index("conversations_last_message_idx").on(t.lastMessageAt),
  ],
);

export type Conversation = typeof conversations.$inferSelect;
