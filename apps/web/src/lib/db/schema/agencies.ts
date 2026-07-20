import { relations, sql } from "drizzle-orm";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { softDelete, timestamps } from "./_shared";
import { clients } from "./clients";

/** ADR-003 tier ladder. `agency` (white-label/resale) is v2. */
export const agencyPlanEnum = pgEnum("agency_plan", ["free", "pro", "agency"]);

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

  plan: agencyPlanEnum("plan").notNull().default("free"),
  status: agencyStatusEnum("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

  // Stripe owns billing (ADR-004). We only keep the pointers.
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),

  // White-label lands here in v2. Kept on Agency from the start so v2 is an
  // additive change, not a migration (ADR-002).
  brandLogoUrl: text("brand_logo_url"),
  brandColor: text("brand_color"),
  customDomain: text("custom_domain").unique(),

  ...timestamps,
  ...softDelete,
});

export const agenciesRelations = relations(agencies, ({ many }) => ({
  clients: many(clients),
}));

export type Agency = typeof agencies.$inferSelect;
export type NewAgency = typeof agencies.$inferInsert;
