import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, withAgency } from "@/lib/db";
import { agencies, billingCustomers, billingEvents } from "@/lib/db/schema";
import { periodEndOf, planForPrice, priceIdOf, statusForSubscription } from "./stripe";

export type SyncResult =
  | { applied: true; agencyId: string; plan: string; status: string }
  | { applied: false; reason: string };

/**
 * Record that an event has been handled, and say whether it is new.
 *
 * Stripe retries on any non-2xx and can deliver the same event twice even after
 * a success, so every handler must be safe to run again. The unique index does
 * the work: a second insert conflicts and returns nothing.
 */
export async function claimEvent(event: Stripe.Event): Promise<boolean> {
  const inserted = await db
    .insert(billingEvents)
    .values({
      stripeEventId: event.id,
      type: event.type,
      occurredAt: new Date(event.created * 1000),
    })
    .onConflictDoNothing({ target: billingEvents.stripeEventId })
    .returning({ id: billingEvents.id });

  return inserted.length > 0;
}

/**
 * Give up a claim so Stripe's retry is processed rather than skipped.
 *
 * Without this, a handler that throws leaves the event marked as seen: Stripe
 * retries, the retry is dismissed as a duplicate, and the change is lost
 * forever. That is the worst failure mode in billing — the customer has paid and
 * nothing happened.
 */
export async function releaseEvent(eventId: string) {
  await db.delete(billingEvents).where(eq(billingEvents.stripeEventId, eventId));
}

/**
 * Resolve a Stripe customer to an agency.
 *
 * Reads `billing_customers`, which is not tenant-scoped, because no tenant is
 * known yet — reading `agencies.stripeCustomerId` here would match nothing under
 * RLS and every payment would silently fail to unlock anything.
 */
export async function agencyForCustomer(customerId: string): Promise<string | null> {
  const [row] = await db
    .select({ agencyId: billingCustomers.agencyId })
    .from(billingCustomers)
    .where(eq(billingCustomers.stripeCustomerId, customerId))
    .limit(1);
  return row?.agencyId ?? null;
}

/** Link a Stripe customer to an agency. Idempotent. */
export async function linkCustomer(agencyId: string, customerId: string) {
  await db
    .insert(billingCustomers)
    .values({ agencyId, stripeCustomerId: customerId })
    .onConflictDoNothing({ target: billingCustomers.stripeCustomerId });

  await withAgency(agencyId, (tx) =>
    tx
      .update(agencies)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(agencies.id, agencyId)),
  );
}

/**
 * Apply a subscription's state to the agency it belongs to.
 *
 * Stripe does not guarantee delivery order, so an event older than the last one
 * applied is discarded. Without that check a delayed `subscription.updated` from
 * before a cancellation could quietly restore a plan the customer has left.
 */
export async function syncSubscription(
  subscription: Stripe.Subscription,
  occurredAt: Date,
): Promise<SyncResult> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return { applied: false, reason: "No customer on the subscription." };

  const agencyId = await agencyForCustomer(customerId);
  if (!agencyId) return { applied: false, reason: "No agency for that customer." };

  const priceId = priceIdOf(subscription);
  const plan = planForPrice(priceId);
  const status = statusForSubscription(subscription.status);

  // A cancelled subscription drops to free; an unrecognised price is left alone
  // rather than guessed at, so a new price added in the dashboard before it is
  // configured here cannot downgrade a paying customer.
  const nextPlan =
    status === "canceled" ? "free" : (plan ?? null);

  return withAgency(agencyId, async (tx) => {
    const [current] = await tx
      .select({ syncedAt: agencies.billingSyncedAt, plan: agencies.plan })
      .from(agencies)
      .where(eq(agencies.id, agencyId))
      .limit(1);

    if (!current) return { applied: false as const, reason: "Agency not found." };

    if (current.syncedAt && current.syncedAt > occurredAt) {
      return { applied: false as const, reason: "Older event ignored." };
    }

    await tx
      .update(agencies)
      .set({
        ...(nextPlan ? { plan: nextPlan } : {}),
        status,
        stripeSubscriptionId: subscription.id,
        currentPeriodEnd: periodEndOf(subscription),
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        billingSyncedAt: occurredAt,
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, agencyId));

    return {
      applied: true as const,
      agencyId,
      plan: nextPlan ?? current.plan,
      status,
    };
  });
}
