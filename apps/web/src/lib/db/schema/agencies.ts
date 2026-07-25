import { sql } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { softDelete, timestamps } from "./_shared";
import { billingColumns } from "./billing";
import type { BillingOverrides, BillingProfile } from "@/lib/billing/profile";

/** Product tiers: Starter · Professional · Agency · Enterprise */
export const agencyPlanEnum = pgEnum("agency_plan", [
  "starter",
  "professional",
  "agency",
  "enterprise",
]);

export const agencyStatusEnum = pgEnum("agency_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

/**
 * The tenant (ADR-002). One paying customer. GoHighLevel calls this the Agency.
 * Everything else in the database hangs off this row.
 */
export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),

  plan: agencyPlanEnum("plan").notNull().default("starter"),
  status: agencyStatusEnum("status").notNull().default("active"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

  // Stripe owns billing (ADR-004). We keep pointers and the state the app
  // gates on. The customer -> agency *lookup* lives in billing_customers,
  // which is not tenant-scoped — see the comment there.
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  /** Cached from Stripe price recurring.interval — month | year */
  billingInterval: text("billing_interval").$type<"month" | "year" | null>(),
  ...billingColumns,

  /** Tax, invoice prefs, notification toggles — see BillingProfile. */
  billingProfile: jsonb("billing_profile")
    .$type<BillingProfile>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  /** Owner tools: complimentary, limit overrides, suspend flag. */
  billingOverrides: jsonb("billing_overrides")
    .$type<BillingOverrides>()
    .notNull()
    .default(sql`'{}'::jsonb`),

  // White-label lands here in v2. Kept on Agency from the start so v2 is an
  // additive change, not a migration (ADR-002).
  brandLogoUrl: text("brand_logo_url"),
  brandColor: text("brand_color"),
  customDomain: text("custom_domain").unique(),

  ...timestamps,
  ...softDelete,
});

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
