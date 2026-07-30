import type Stripe from "stripe";
import { claimEvent, linkCustomer, releaseEvent, syncSubscription } from "@/lib/billing/sync";
import { stripe, stripeVerifier } from "@/lib/billing/stripe";

/**
 * POST /api/v1/stripe/webhook
 *
 * Where subscription state actually changes. The checkout redirect is a
 * convenience; this is the source of truth, because a customer can close the
 * browser mid-redirect, pay by invoice, or cancel from the portal — and all of
 * those arrive only here.
 *
 * Must read the raw body: the signature covers the exact bytes Stripe sent, so
 * parsing to JSON first and re-serialising would break verification.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("stripe webhook: STRIPE_WEBHOOK_SECRET is not set — rejecting");
    return Response.json({ error: "not_configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "missing_signature" }, { status: 400 });
  }

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripeVerifier().webhooks.constructEventAsync(raw, signature, secret);
  } catch (e) {
    // Includes replays outside the timestamp tolerance, which the SDK rejects.
    console.error("stripe webhook: signature rejected", e instanceof Error ? e.message : e);
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Idempotency first. Stripe retries on any non-2xx and can deliver a second
  // copy even after a success.
  const isNew = await claimEvent(event);
  if (!isNew) {
    return Response.json({ status: "duplicate", id: event.id });
  }

  const occurredAt = new Date(event.created * 1000);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const agencyId = session.client_reference_id ?? session.metadata?.agency_id;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (session.metadata?.purpose === "marketplace_listing") {
          const { fulfillMarketplacePurchase } = await import(
            "@/lib/forms/marketplace-billing"
          );
          const result = await fulfillMarketplacePurchase(session);
          if (!result.ok) {
            console.error("stripe webhook: marketplace fulfill failed", result.error);
          }
          if (agencyId && customerId) await linkCustomer(agencyId, customerId);
          break;
        }

        if (!agencyId || !customerId) {
          console.error("stripe webhook: checkout session missing agency or customer");
          break;
        }

        // Links the customer so every later subscription event can be resolved.
        await linkCustomer(agencyId, customerId);

        // The session itself carries no subscription items, so fetch the
        // subscription rather than guessing the plan from the price line. This
        // is the one branch that needs API access; the subscription.* events
        // that follow carry everything and will correct the state anyway.
        const client = stripe();
        if (session.subscription && client) {
          const id =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await client.subscriptions.retrieve(id);
          await syncSubscription(subscription, occurredAt);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await syncSubscription(subscription, occurredAt);
        if (!result.applied) {
          console.warn("stripe webhook: not applied —", result.reason);
        }
        break;
      }

      default:
        // Everything else is acknowledged and ignored. Returning an error for
        // unhandled types would make Stripe retry them for days.
        break;
    }
  } catch (e) {
    console.error("stripe webhook: handler threw", e);
    // Release the claim before answering, or Stripe's retry would be dismissed
    // as a duplicate and the change lost for good.
    await releaseEvent(event.id);
    return Response.json({ error: "handler_failed" }, { status: 500 });
  }

  return Response.json({ status: "ok", id: event.id });
}
