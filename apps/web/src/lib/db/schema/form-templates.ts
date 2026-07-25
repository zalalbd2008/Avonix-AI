import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, softDelete, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { websites } from "./websites";
import { forms, type FormField, type FormSettings } from "./forms";
import { user } from "./auth";

/**
 * Organization Cloud Form Template Library (ADR-007).
 * Tenant = agency_id. Destinations encode as scope + status + optional site.
 */

export type FormTemplateScope =
  | "website"
  | "organization"
  | "personal"
  | "team"
  | "global";

export type FormTemplateStatus =
  | "draft"
  | "pending_approval"
  | "published"
  | "rejected"
  | "archived"
  | "deprecated";

export type FormTemplateShareTarget = "user" | "role" | "team";

export type FormTemplateSharePermission =
  | "view"
  | "duplicate"
  | "edit"
  | "publish";

export type FormTemplateVisibility =
  | "private"
  | "organization"
  | "team"
  | "public";

export type FormTemplateCategory =
  | "contact"
  | "lead"
  | "booking"
  | "survey"
  | "quiz"
  | "registration"
  | "payment"
  | "popup"
  | "multi_step"
  | "conversational"
  | "other";

export const formTemplates = pgTable(
  "form_templates",
  {
    ...primaryId,
    agencyId: agencyId(),

    name: text("name").notNull(),
    description: text("description"),
    category: text("category").$type<FormTemplateCategory>(),
    subCategory: text("sub_category"),
    industry: text("industry"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
    department: text("department"),
    language: text("language").notNull().default("en"),
    region: text("region"),

    thumbnailUrl: text("thumbnail_url"),
    previewImageUrl: text("preview_image_url"),

    version: integer("version").notNull().default(1),
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    settings: jsonb("settings").$type<FormSettings>().notNull().default({ steps: [] }),
    submitLabel: text("submit_label").notNull().default("Send"),
    successMessage: text("success_message")
      .notNull()
      .default("Thanks — we'll be in touch."),

    scope: text("scope").$type<FormTemplateScope>().notNull().default("organization"),
    status: text("status").$type<FormTemplateStatus>().notNull().default("draft"),
    visibility: text("visibility")
      .$type<FormTemplateVisibility>()
      .notNull()
      .default("organization"),

    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    /** Reserved for team-scoped templates (Step 4). */
    teamId: text("team_id"),
    sourceFormId: uuid("source_form_id").references(() => forms.id, {
      onDelete: "set null",
    }),

    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),

    usageCount: integer("usage_count").notNull().default(0),
    isLocked: boolean("is_locked").notNull().default(false),
    lockedBy: text("locked_by").references(() => user.id, {
      onDelete: "set null",
    }),
    lockedAt: timestamp("locked_at", { withTimezone: true }),

    /** Approval workflow (ADR-007 Step 4). */
    submittedBy: text("submitted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNote: text("review_note"),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("form_templates_agency_idx").on(t.agencyId),
    index("form_templates_scope_idx").on(t.agencyId, t.scope, t.status),
    index("form_templates_website_idx").on(t.websiteId),
    index("form_templates_created_by_idx").on(t.createdBy),
  ],
);

/** Append-only version snapshots for a template (ADR-007 Step 2 UI). */
export const formTemplateVersions = pgTable(
  "form_template_versions",
  {
    ...primaryId,
    agencyId: agencyId(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => formTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    changelog: text("changelog"),
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    settings: jsonb("settings").$type<FormSettings>().notNull().default({ steps: [] }),
    submitLabel: text("submit_label").notNull().default("Send"),
    successMessage: text("success_message")
      .notNull()
      .default("Thanks — we'll be in touch."),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("form_template_versions_tpl_idx").on(t.templateId, t.version),
    index("form_template_versions_agency_idx").on(t.agencyId),
  ],
);

/** Per-user favorites inside an organization (ADR-007 Step 3). */
export const formTemplateFavorites = pgTable(
  "form_template_favorites",
  {
    ...primaryId,
    agencyId: agencyId(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => formTemplates.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    uniqueIndex("form_template_favorites_uniq").on(
      t.agencyId,
      t.userId,
      t.templateId,
    ),
    index("form_template_favorites_user_idx").on(t.userId),
  ],
);

/** Named collections / folders for templates (ADR-007 Step 3). */
export const formTemplateCollections = pgTable(
  "form_template_collections",
  {
    ...primaryId,
    agencyId: agencyId(),
    name: text("name").notNull(),
    description: text("description"),
    /** personal = owner only; organization = shared folder */
    visibility: text("visibility")
      .$type<"personal" | "organization">()
      .notNull()
      .default("personal"),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("form_template_collections_agency_idx").on(t.agencyId),
    index("form_template_collections_owner_idx").on(t.createdBy),
  ],
);

export const formTemplateCollectionItems = pgTable(
  "form_template_collection_items",
  {
    ...primaryId,
    agencyId: agencyId(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => formTemplateCollections.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => formTemplates.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    uniqueIndex("form_template_collection_items_uniq").on(
      t.collectionId,
      t.templateId,
    ),
    index("form_template_collection_items_tpl_idx").on(t.templateId),
  ],
);

/**
 * Explicit shares inside one organization (ADR-007 Step 4).
 * targetType=user → targetUserId; role → targetRole; team → teamId.
 */
export const formTemplateShares = pgTable(
  "form_template_shares",
  {
    ...primaryId,
    agencyId: agencyId(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => formTemplates.id, { onDelete: "cascade" }),
    targetType: text("target_type")
      .$type<FormTemplateShareTarget>()
      .notNull(),
    targetUserId: text("target_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    targetRole: text("target_role").$type<"owner" | "admin" | "member">(),
    teamId: text("team_id"),
    permissions: jsonb("permissions")
      .$type<FormTemplateSharePermission[]>()
      .notNull()
      .default(["view", "duplicate"]),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("form_template_shares_tpl_idx").on(t.templateId),
    index("form_template_shares_user_idx").on(t.targetUserId),
    index("form_template_shares_agency_idx").on(t.agencyId),
  ],
);

export type FormTemplate = typeof formTemplates.$inferSelect;
export type NewFormTemplate = typeof formTemplates.$inferInsert;
export type FormTemplateCollection = typeof formTemplateCollections.$inferSelect;
export type FormTemplateShare = typeof formTemplateShares.$inferSelect;
