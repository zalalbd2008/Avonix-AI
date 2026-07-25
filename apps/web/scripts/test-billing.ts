/**
 * Exercises subscription sync.
 *
 * The webhook is where money becomes access, and its failure modes are quiet:
 * a dropped event means a customer who paid and got nothing. So the tests cover
 * duplicates, out-of-order delivery, cancellation, unknown prices, and someone
 * else's customer id — not just the happy path.
 *
 * Signature verification is exercised over HTTP against the running dev server,
 * signed with the same secret the app is configured with.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/test-billing.ts
 */
import { createHmac, randomBytes } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${name}`);
    pass++;
  } else {
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
    fail++;
  }
}

/** A Stripe subscription object, shaped as the current API returns it. */
function subscription(opts: {
  customerId: string;
  status?: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  periodEnd?: number;
  id?: string;
}) {
  return {
    id: opts.id ?? `sub_${randomBytes(8).toString("hex")}`,
    object: "subscription",
    customer: opts.customerId,
    status: opts.status ?? "active",
    cancel_at_period_end: opts.cancelAtPeriodEnd ?? false,
    items: {
      object: "list",
      data: [
        {
          id: `si_${randomBytes(6).toString("hex")}`,
          object: "subscription_item",
          // Current API versions carry the period on the item, not the
          // subscription — reading the old path yields undefined silently.
          current_period_end: opts.periodEnd ?? Math.floor(Date.now() / 1000) + 30 * 86400,
          price: { id: opts.priceId ?? process.env.STRIPE_PRICE_PROFESSIONAL ?? "price_professional_test" },
        },
      ],
    },
  };
}

function stripeEvent(type: string, object: unknown, createdAt = Date.now()) {
  return {
    id: `evt_${randomBytes(10).toString("hex")}`,
    object: "event",
    type,
    created: Math.floor(createdAt / 1000),
    data: { object },
  };
}

/** Sign a payload exactly the way Stripe does, so verification is really tested. */
function sign(payload: string, secret: string, timestamp = Math.floor(Date.now() / 1000)) {
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function postWebhook(event: unknown, opts: { secret?: string; timestamp?: number } = {}) {
  const payload = JSON.stringify(event);
  const header = sign(payload, opts.secret ?? WEBHOOK_SECRET, opts.timestamp);
  const res = await fetch(`${BASE}/api/v1/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": header },
    body: payload,
  });
  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, json };
}

async function main() {
  const { eq, sql } = await import("drizzle-orm");
  const { db, withAgency } = await import("../src/lib/db");
  const { agencies, billingEvents } = await import("../src/lib/db/schema");
  const { linkCustomer, syncSubscription } = await import("../src/lib/billing/sync");
  const { periodEndOf, planForPrice, statusForSubscription } = await import(
    "../src/lib/billing/stripe"
  );

  process.env.STRIPE_PRICE_PROFESSIONAL ??= "price_professional_test";
  process.env.STRIPE_PRICE_AGENCY ??= "price_agency_test";

  const agencyId = crypto.randomUUID();
  const customerId = `cus_${randomBytes(8).toString("hex")}`;

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${agencyId}, true)`);
    await tx.insert(agencies).values({
      id: agencyId,
      name: "Billing Test",
      slug: `billing-${randomBytes(4).toString("hex")}`,
      plan: "starter",
      status: "trialing",
    });
  });

  const readAgency = () =>
    withAgency(agencyId, (tx) =>
      tx
        .select({
          plan: agencies.plan,
          status: agencies.status,
          periodEnd: agencies.currentPeriodEnd,
          cancelling: agencies.cancelAtPeriodEnd,
          subId: agencies.stripeSubscriptionId,
        })
        .from(agencies)
        .where(eq(agencies.id, agencyId)),
    ).then((r) => r[0]);

  console.log("Field mapping");
  const sub = subscription({ customerId });
  check("reads the period from the subscription item", periodEndOf(sub as never) !== null);
  check("maps the configured price to a plan", planForPrice("price_professional_test") === "professional");
  check("leaves an unknown price unmapped", planForPrice("price_mystery") === null);
  check("past_due keeps access rather than cutting it off", statusForSubscription("past_due" as never) === "past_due");
  check("incomplete counts as cancelled", statusForSubscription("incomplete" as never) === "canceled");

  console.log("\nBefore the customer is linked");
  const orphan = await syncSubscription(subscription({ customerId }) as never, new Date());
  check("an unknown customer is not applied", !orphan.applied, JSON.stringify(orphan));
  check("and the plan is untouched", (await readAgency()).plan === "starter");

  console.log("\nUpgrade");
  await linkCustomer(agencyId, customerId);
  const upgraded = await syncSubscription(subscription({ customerId }) as never, new Date());
  check("applies once the customer is linked", upgraded.applied, JSON.stringify(upgraded));

  const afterUpgrade = await readAgency();
  check("the plan becomes professional", afterUpgrade.plan === "professional", afterUpgrade.plan);
  check("the status becomes active", afterUpgrade.status === "active", afterUpgrade.status);
  check("the renewal date is stored", Boolean(afterUpgrade.periodEnd));

  console.log("\nOut-of-order delivery");
  const stale = new Date(Date.now() - 60 * 60 * 1000);
  const late = await syncSubscription(
    subscription({ customerId, status: "canceled" }) as never,
    stale,
  );
  check("an older event is discarded", !late.applied, JSON.stringify(late));
  check("so the newer plan survives", (await readAgency()).plan === "professional");

  console.log("\nUnrecognised price");
  await syncSubscription(
    subscription({ customerId, priceId: "price_not_configured" }) as never,
    new Date(),
  );
  check(
    "a price we do not know does not downgrade a payer",
    (await readAgency()).plan === "professional",
    (await readAgency()).plan,
  );

  console.log("\nCancellation");
  await syncSubscription(
    subscription({ customerId, cancelAtPeriodEnd: true }) as never,
    new Date(),
  );
  const cancelling = await readAgency();
  check("cancel-at-period-end is recorded", cancelling.cancelling === true);
  check("but access continues until the period ends", cancelling.plan === "professional");

  await syncSubscription(
    subscription({ customerId, status: "canceled" }) as never,
    new Date(),
  );
  const cancelled = await readAgency();
  check("a cancelled subscription drops to starter", cancelled.plan === "starter", cancelled.plan);
  check("and the status is canceled", cancelled.status === "canceled", cancelled.status);

  console.log("\nWebhook signature");
  const event = stripeEvent("customer.subscription.updated", subscription({ customerId }));
  check("an unsigned request is rejected", (await unsigned(event)).status === 400);
  check(
    "a wrong secret is rejected",
    (await postWebhook(event, { secret: "whsec_wrong" })).status === 400,
  );
  check(
    "an old timestamp is rejected as a replay",
    (await postWebhook(event, { timestamp: Math.floor(Date.now() / 1000) - 86400 })).status === 400,
  );

  const accepted = await postWebhook(event);
  check("a correctly signed event is accepted", accepted.status === 200, JSON.stringify(accepted.json));

  console.log("\nIdempotency");
  const replay = await postWebhook(event);
  check("the same event twice is a no-op", replay.json.status === "duplicate", JSON.stringify(replay.json));

  const rows = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(eq(billingEvents.stripeEventId, event.id as string));
  check("and is recorded exactly once", rows.length === 1, `${rows.length}`);

  console.log("\nAnother agency's customer");
  const otherId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${otherId}, true)`);
    await tx.insert(agencies).values({
      id: otherId,
      name: "Other",
      slug: `other-${randomBytes(4).toString("hex")}`,
      plan: "starter",
    });
  });

  await syncSubscription(subscription({ customerId }) as never, new Date());
  const other = await withAgency(otherId, (tx) =>
    tx.select({ plan: agencies.plan }).from(agencies).where(eq(agencies.id, otherId)),
  );
  check("does not upgrade an unrelated agency", other[0].plan === "starter", other[0].plan);

  await db.delete(billingEvents).where(eq(billingEvents.stripeEventId, event.id as string));
  await withAgency(agencyId, (tx) => tx.delete(agencies).where(eq(agencies.id, agencyId)));
  await withAgency(otherId, (tx) => tx.delete(agencies).where(eq(agencies.id, otherId)));

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`billing ok — ${pass} checks passed`);
}

async function unsigned(event: unknown) {
  const res = await fetch(`${BASE}/api/v1/stripe/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return { status: res.status };
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
