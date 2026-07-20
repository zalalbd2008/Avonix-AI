import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencies } from "./agencies";

/**
 * Stripe customer -> agency.
 *
 * NOT TENANT-SCOPED — the fourth table of its kind, and the one the comment on
 * `reply_tokens` predicted would eventually be needed. A Stripe webhook arrives
 * knowing only a customer id, so resolving it against `agencies.stripeCustomerId`
 * would read a tenant-scoped table with no tenant set and match nothing. Every
 * subscription change would then be silently dropped, which is the worst
 * possible place for this bug: the customer pays and the plan never changes.
 *
 *   memberships       signed-in user -> agency
 *   connector_keys    plugin key     -> agency
 *   reply_tokens      inbound email  -> agency
 *   billing_customers stripe customer -> agency
 */
export const billingCustomers = pgTable(
  "billing_customers",
  {
    ...primaryId,
    agencyId: uuid("agency_id").notNull().references(() => agencies.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("billing_customers_stripe_key").on(t.stripeCustomerId),
    index("billing_customers_agency_idx").on(t.agencyId),
  ],
);

/**
 * Every Stripe event we have already applied.
 *
 * Stripe retries on any non-2xx and can deliver the same event more than once
 * even on success, so handlers must be idempotent. Also NOT tenant-scoped: the
 * dedupe check happens before the customer is resolved.
 */
export const billingEvents = pgTable(
  "billing_events",
  {
    ...primaryId,
    stripeEventId: text("stripe_event_id").notNull(),
    type: text("type").notNull(),
    /** Stripe's own creation time, used to discard events that arrive out of order. */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("billing_events_stripe_key").on(t.stripeEventId)],
);

export type BillingCustomer = typeof billingCustomers.$inferSelect;
export type BillingEvent = typeof billingEvents.$inferSelect;

/** Extra subscription state kept on the agency; see agencies.ts for the rest. */
export const billingColumns = {
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  /**
   * Stripe's timestamp for the last event we applied. Events are not delivered
   * in order, so an older one arriving late must not undo a newer one.
   */
  billingSyncedAt: timestamp("billing_synced_at", { withTimezone: true }),
};
