/**
 * Platform Template Marketplace listings (ADR-008 / ADR-007 Step 7).
 *
 * Snapshots only — never a live join into another org's form_templates.
 * RLS: published rows are readable by any authenticated tenant; writes stay
 * on the publisher's agency_id.
 */
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
import { sql } from "drizzle-orm";
import { primaryId, softDelete, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { forms, type FormField, type FormSettings } from "./forms";
import { formTemplates } from "./form-templates";
import { user } from "./auth";

export type MarketplaceListingKind = "template" | "component" | "section";

export type MarketplaceListingStatus =
  | "draft"
  | "published"
  | "archived"
  | "rejected";

export type MarketplaceListingVisibility = "public" | "unlisted";

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    ...primaryId,
    /** Publisher organization. */
    agencyId: agencyId(),
    kind: text("kind")
      .$type<MarketplaceListingKind>()
      .notNull()
      .default("template"),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    industry: text("industry"),
    thumbnailUrl: text("thumbnail_url"),
    status: text("status")
      .$type<MarketplaceListingStatus>()
      .notNull()
      .default("draft"),
    visibility: text("visibility")
      .$type<MarketplaceListingVisibility>()
      .notNull()
      .default("public"),
    isOfficial: boolean("is_official").notNull().default(false),
    isPremium: boolean("is_premium").notNull().default(false),
    /** Reserved — Stripe price id when paid marketplace ships. */
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),

    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    settings: jsonb("settings")
      .$type<FormSettings>()
      .notNull()
      .default({ steps: [] }),
    submitLabel: text("submit_label").notNull().default("Send"),
    successMessage: text("success_message")
      .notNull()
      .default("Thanks — we'll be in touch."),

    sourceTemplateId: uuid("source_template_id").references(
      () => formTemplates.id,
      { onDelete: "set null" },
    ),
    sourceFormId: uuid("source_form_id").references(() => forms.id, {
      onDelete: "set null",
    }),

    installCount: integer("install_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true }).default(
      sql`now()`,
    ),

    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("marketplace_listings_agency_idx").on(t.agencyId),
    index("marketplace_listings_status_idx").on(t.status, t.visibility),
    index("marketplace_listings_official_idx").on(t.isOfficial),
  ],
);

/** Installs are buyer-tenant rows only (normal RLS). */
export const marketplaceInstalls = pgTable(
  "marketplace_installs",
  {
    ...primaryId,
    agencyId: agencyId(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListings.id, { onDelete: "cascade" }),
    installedTemplateId: uuid("installed_template_id").references(
      () => formTemplates.id,
      { onDelete: "set null" },
    ),
    installedBy: text("installed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("marketplace_installs_agency_idx").on(t.agencyId),
    uniqueIndex("marketplace_installs_uniq").on(t.agencyId, t.listingId),
  ],
);

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type MarketplaceInstall = typeof marketplaceInstalls.$inferSelect;
