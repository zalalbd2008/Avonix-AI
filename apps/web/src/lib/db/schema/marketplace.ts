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
    /** True when priceCents > 0 — buyers must purchase before install. */
    isPremium: boolean("is_premium").notNull().default(false),
    /** One-time price in minor units (e.g. cents). 0 = free. */
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

/**
 * Buyer entitlements for paid listings. Money settles on the platform Stripe
 * account; seller_net is ledgered for future Connect payouts.
 */
export type MarketplacePurchaseStatus =
  | "pending"
  | "paid"
  | "refunded"
  | "failed";

export const marketplacePurchases = pgTable(
  "marketplace_purchases",
  {
    ...primaryId,
    /** Buyer organization. */
    agencyId: agencyId(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => marketplaceListings.id, { onDelete: "cascade" }),
    /** Publisher org at purchase time (may differ from listing.agency_id if transferred). */
    sellerAgencyId: uuid("seller_agency_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    platformFeeCents: integer("platform_fee_cents").notNull().default(0),
    sellerNetCents: integer("seller_net_cents").notNull().default(0),
    status: text("status")
      .$type<MarketplacePurchaseStatus>()
      .notNull()
      .default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    purchasedBy: text("purchased_by").references(() => user.id, {
      onDelete: "set null",
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("marketplace_purchases_agency_idx").on(t.agencyId),
    index("marketplace_purchases_listing_idx").on(t.listingId),
    index("marketplace_purchases_seller_idx").on(t.sellerAgencyId),
    uniqueIndex("marketplace_purchases_session_uniq").on(
      t.stripeCheckoutSessionId,
    ),
    uniqueIndex("marketplace_purchases_paid_uniq").on(t.agencyId, t.listingId),
  ],
);

export type MarketplaceListing = typeof marketplaceListings.$inferSelect;
export type MarketplaceInstall = typeof marketplaceInstalls.$inferSelect;
export type MarketplacePurchase = typeof marketplacePurchases.$inferSelect;
