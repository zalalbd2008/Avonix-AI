import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenantColumns, timestamps } from "./_shared";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { messages } from "./messages";
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
    ...tenantColumns,
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

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  client: one(clients, { fields: [conversations.clientId], references: [clients.id] }),
  contact: one(contacts, { fields: [conversations.contactId], references: [contacts.id] }),
  messages: many(messages),
}));

export type Conversation = typeof conversations.$inferSelect;
