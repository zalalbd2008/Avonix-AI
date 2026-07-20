import { count, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { ManageBillingButton, UpgradeButton } from "@/components/billing-actions";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies, clients, websites } from "@/lib/db/schema";
import { billingConfigured } from "@/lib/billing/stripe";
import { PLANS, formatLimit, limitsFor } from "@/lib/plans";

/**
 * Route: /billing
 *
 * This page used to be a stub while the clients list already offered an
 * "Upgrade to add more" button that led here — a promise the product could not
 * keep. That is the gap this closes.
 */
export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [[agency], [clientCount], [websiteCount]] = await Promise.all([
      tx
        .select({
          plan: agencies.plan,
          status: agencies.status,
          periodEnd: agencies.currentPeriodEnd,
          cancelling: agencies.cancelAtPeriodEnd,
          trialEndsAt: agencies.trialEndsAt,
          customerId: agencies.stripeCustomerId,
        })
        .from(agencies)
        .where(eq(agencies.id, ctx.agencyId))
        .limit(1),
      tx.select({ n: count() }).from(clients),
      tx.select({ n: count() }).from(websites),
    ]);
    return { agency, clients: clientCount.n, websites: websiteCount.n };
  });

  const limits = limitsFor(data.agency.plan);
  const configured = billingConfigured();

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Billing"
        subtitle={`You are on the ${limits.label} plan`}
        action={data.agency.customerId ? <ManageBillingButton /> : undefined}
      />

      {upgraded && (
        <p className="mb-4 rounded-xl border border-[#bfe9e2] bg-[#f0fdf9] px-4 py-3 text-[13px] text-ok">
          Payment received. If the plan below still looks wrong, give it a moment —
          it updates when Stripe confirms the subscription.
        </p>
      )}

      {!configured && (
        <p className="mb-4 rounded-xl border border-[#ffd9bd] bg-[#fff8f3] px-4 py-3 text-[13px]">
          <b>Billing is not connected yet.</b> Set STRIPE_SECRET_KEY,
          STRIPE_WEBHOOK_SECRET and the price ids to take payments. Upgrading will
          not work until then.
        </p>
      )}

      {data.agency.status === "past_due" && (
        <p className="mb-4 rounded-xl border border-[#f5d0a9] bg-[#fef6e7] px-4 py-3 text-[13px] text-warn">
          <b>A payment did not go through.</b> Your plan is still active while
          Stripe retries — update the card from “Manage billing”.
        </p>
      )}

      {data.agency.cancelling && data.agency.periodEnd && (
        <p className="mb-4 rounded-xl border border-line bg-white px-4 py-3 text-[13px]">
          This subscription ends on{" "}
          <b>{new Date(data.agency.periodEnd).toLocaleDateString()}</b> and then
          drops to Free.
        </p>
      )}

      <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          Current usage
        </h2>
        <div className="grid grid-cols-2 gap-4 px-4 py-4 text-[13px]">
          <Usage label="Clients" used={data.clients} allowed={limits.maxClients} />
          <Usage label="Websites" used={data.websites} allowed={Number.POSITIVE_INFINITY} />
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((key) => {
          const plan = PLANS[key];
          const current = data.agency.plan === key;
          return (
            <div
              key={key}
              className={`flex flex-col gap-2.5 rounded-xl border bg-white p-4 ${
                current ? "border-brand" : "border-line"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold">{plan.label}</span>
                {current && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    current
                  </span>
                )}
              </div>
              <ul className="flex flex-col gap-1 text-[12.5px] text-muted">
                <li>{formatLimit(plan.maxClients)} clients</li>
                <li>{formatLimit(plan.maxWebsitesPerClient)} websites per client</li>
                <li>{plan.maxAiMessagesPerMonth.toLocaleString()} AI messages a month</li>
                <li>{plan.whiteLabel ? "White-label" : "No white-label"}</li>
              </ul>
              <div className="mt-auto pt-2">
                {current ? (
                  <div className="rounded-lg bg-[#f1f4f8] py-2.5 text-center text-[13px] font-semibold text-muted">
                    Your plan
                  </div>
                ) : key === "free" ? (
                  <div className="rounded-lg bg-[#f1f4f8] py-2.5 text-center text-[12.5px] text-faint">
                    Cancel from Manage billing
                  </div>
                ) : (
                  <UpgradeButton
                    plan={key}
                    label={`Upgrade to ${plan.label}`}
                    disabled={!configured}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prices deliberately absent: ADR-003 sets them after ten paying customers. */}
      <p className="mt-4 text-[12px] text-faint">
        Plans are billed through Stripe. Cancel any time from Manage billing.
      </p>
    </div>
  );
}

function Usage({ label, used, allowed }: { label: string; used: number; allowed: number }) {
  const pct = Number.isFinite(allowed) ? Math.min(100, (used / allowed) * 100) : 0;
  const atLimit = Number.isFinite(allowed) && used >= allowed;

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-semibold">{label}</span>
        <span className={`ml-auto text-[12.5px] ${atLimit ? "text-warn" : "text-muted"}`}>
          {used} of {formatLimit(allowed)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#edf0f5]">
        <div
          className={`h-full ${atLimit ? "bg-warn" : "bg-ok"}`}
          style={{ width: `${Number.isFinite(allowed) ? pct : 6}%` }}
        />
      </div>
    </div>
  );
}
