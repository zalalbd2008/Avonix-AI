import { relations } from "drizzle-orm";
import { agencies } from "./agencies";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { forms, formSubmissions } from "./forms";
import { user } from "./auth";
import { memberships } from "./users";
import { messages } from "./messages";
import { pipelineCards, pipelineStages, pipelines } from "./pipelines";
import { websites } from "./websites";

/**
 * Every `relations()` declaration, in one file.
 *
 * These live apart from the table definitions on purpose. A relation names two
 * tables, so declaring them beside the tables makes the import graph cyclic —
 * which TypeScript tolerates (types are erased) but Node does not: the cycle
 * surfaces at runtime as "Cannot access 'X' before initialization" when
 * drizzle-kit loads the schema.
 *
 * Table files import only what they hold a foreign key to. Relations import
 * everything. The graph stays acyclic.
 */

export const agenciesRelations = relations(agencies, ({ many }) => ({
  clients: many(clients),
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  agency: one(agencies, {
    fields: [memberships.agencyId],
    references: [agencies.id],
  }),
  user: one(user, { fields: [memberships.userId], references: [user.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [clients.agencyId],
    references: [agencies.id],
  }),
  websites: many(websites),
  contacts: many(contacts),
  conversations: many(conversations),
  forms: many(forms),
  pipelines: many(pipelines),
}));

export const websitesRelations = relations(websites, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [websites.agencyId],
    references: [agencies.id],
  }),
  client: one(clients, {
    fields: [websites.clientId],
    references: [clients.id],
  }),
  contacts: many(contacts),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
  sourceWebsite: one(websites, {
    fields: [contacts.sourceWebsiteId],
    references: [websites.id],
  }),
  conversations: many(conversations),
  cards: many(pipelineCards),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [conversations.clientId],
      references: [clients.id],
    }),
    contact: one(contacts, {
      fields: [conversations.contactId],
      references: [contacts.id],
    }),
    website: one(websites, {
      fields: [conversations.websiteId],
      references: [websites.id],
    }),
    messages: many(messages),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const pipelinesRelations = relations(pipelines, ({ one, many }) => ({
  client: one(clients, {
    fields: [pipelines.clientId],
    references: [clients.id],
  }),
  stages: many(pipelineStages),
}));

export const pipelineStagesRelations = relations(
  pipelineStages,
  ({ one, many }) => ({
    pipeline: one(pipelines, {
      fields: [pipelineStages.pipelineId],
      references: [pipelines.id],
    }),
    cards: many(pipelineCards),
  }),
);

export const pipelineCardsRelations = relations(pipelineCards, ({ one }) => ({
  pipeline: one(pipelines, {
    fields: [pipelineCards.pipelineId],
    references: [pipelines.id],
  }),
  stage: one(pipelineStages, {
    fields: [pipelineCards.stageId],
    references: [pipelineStages.id],
  }),
  contact: one(contacts, {
    fields: [pipelineCards.contactId],
    references: [contacts.id],
  }),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  client: one(clients, { fields: [forms.clientId], references: [clients.id] }),
  website: one(websites, {
    fields: [forms.websiteId],
    references: [websites.id],
  }),
  submissions: many(formSubmissions),
}));

export const formSubmissionsRelations = relations(
  formSubmissions,
  ({ one }) => ({
    form: one(forms, {
      fields: [formSubmissions.formId],
      references: [forms.id],
    }),
    contact: one(contacts, {
      fields: [formSubmissions.contactId],
      references: [contacts.id],
    }),
  }),
);
