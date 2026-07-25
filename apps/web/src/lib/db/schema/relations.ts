import { relations } from "drizzle-orm";
import { agencies } from "./agencies";
import { clients } from "./clients";
import { contacts } from "./contacts";
import { conversations } from "./conversations";
import { forms, formSubmissions, formAnalyticsEvents } from "./forms";
import { formTemplates, formTemplateVersions, formTemplateFavorites, formTemplateCollections, formTemplateCollectionItems, formTemplateShares } from "./form-templates";
import { formComponents, formSections, formAssets } from "./form-org-assets";
import { ctaButtonGroups, ctaButtons } from "./cta";
import { marketplaceListings, marketplaceInstalls } from "./marketplace";
import { reportShares, trackedEvents } from "./tracking";
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
  analyticsEvents: many(formAnalyticsEvents),
}));

export const formTemplatesRelations = relations(
  formTemplates,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [formTemplates.clientId],
      references: [clients.id],
    }),
    website: one(websites, {
      fields: [formTemplates.websiteId],
      references: [websites.id],
    }),
    sourceForm: one(forms, {
      fields: [formTemplates.sourceFormId],
      references: [forms.id],
    }),
    versions: many(formTemplateVersions),
  }),
);

export const formTemplateVersionsRelations = relations(
  formTemplateVersions,
  ({ one }) => ({
    template: one(formTemplates, {
      fields: [formTemplateVersions.templateId],
      references: [formTemplates.id],
    }),
  }),
);

export const formTemplateFavoritesRelations = relations(
  formTemplateFavorites,
  ({ one }) => ({
    template: one(formTemplates, {
      fields: [formTemplateFavorites.templateId],
      references: [formTemplates.id],
    }),
  }),
);

export const formTemplateCollectionsRelations = relations(
  formTemplateCollections,
  ({ many }) => ({
    items: many(formTemplateCollectionItems),
  }),
);

export const formTemplateCollectionItemsRelations = relations(
  formTemplateCollectionItems,
  ({ one }) => ({
    collection: one(formTemplateCollections, {
      fields: [formTemplateCollectionItems.collectionId],
      references: [formTemplateCollections.id],
    }),
    template: one(formTemplates, {
      fields: [formTemplateCollectionItems.templateId],
      references: [formTemplates.id],
    }),
  }),
);

export const formTemplateSharesRelations = relations(
  formTemplateShares,
  ({ one }) => ({
    template: one(formTemplates, {
      fields: [formTemplateShares.templateId],
      references: [formTemplates.id],
    }),
  }),
);

export const formComponentsRelations = relations(formComponents, ({ one }) => ({
  client: one(clients, {
    fields: [formComponents.clientId],
    references: [clients.id],
  }),
  website: one(websites, {
    fields: [formComponents.websiteId],
    references: [websites.id],
  }),
}));

export const formSectionsRelations = relations(formSections, ({ one }) => ({
  client: one(clients, {
    fields: [formSections.clientId],
    references: [clients.id],
  }),
  website: one(websites, {
    fields: [formSections.websiteId],
    references: [websites.id],
  }),
}));

export const formAssetsRelations = relations(formAssets, ({ one }) => ({
  client: one(clients, {
    fields: [formAssets.clientId],
    references: [clients.id],
  }),
  website: one(websites, {
    fields: [formAssets.websiteId],
    references: [websites.id],
  }),
}));

export const marketplaceListingsRelations = relations(
  marketplaceListings,
  ({ many }) => ({
    installs: many(marketplaceInstalls),
  }),
);

export const marketplaceInstallsRelations = relations(
  marketplaceInstalls,
  ({ one }) => ({
    listing: one(marketplaceListings, {
      fields: [marketplaceInstalls.listingId],
      references: [marketplaceListings.id],
    }),
    template: one(formTemplates, {
      fields: [marketplaceInstalls.installedTemplateId],
      references: [formTemplates.id],
    }),
  }),
);

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

export const formAnalyticsEventsRelations = relations(
  formAnalyticsEvents,
  ({ one }) => ({
    form: one(forms, {
      fields: [formAnalyticsEvents.formId],
      references: [forms.id],
    }),
    website: one(websites, {
      fields: [formAnalyticsEvents.websiteId],
      references: [websites.id],
    }),
  }),
);

export const trackedEventsRelations = relations(trackedEvents, ({ one }) => ({
  website: one(websites, {
    fields: [trackedEvents.websiteId],
    references: [websites.id],
  }),
}));

export const ctaButtonGroupsRelations = relations(
  ctaButtonGroups,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [ctaButtonGroups.clientId],
      references: [clients.id],
    }),
    website: one(websites, {
      fields: [ctaButtonGroups.websiteId],
      references: [websites.id],
    }),
    buttons: many(ctaButtons),
  }),
);

export const ctaButtonsRelations = relations(ctaButtons, ({ one }) => ({
  group: one(ctaButtonGroups, {
    fields: [ctaButtons.groupId],
    references: [ctaButtonGroups.id],
  }),
}));

export const reportSharesRelations = relations(reportShares, ({ one }) => ({
  website: one(websites, {
    fields: [reportShares.websiteId],
    references: [websites.id],
  }),
}));
