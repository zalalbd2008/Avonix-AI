import { BillingAlert, BillingShell } from "@/components/billing/billing-ui";
import { PlansCompare } from "@/components/billing/plans-compare";
import { requireAgency } from "@/lib/auth/session";
import { loadBillingSnapshot } from "@/lib/billing/snapshot";

/** Route: /billing/plans */
export default async function PlansPricingPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);

  return (
    <BillingShell
      icon="plan"
      eyebrow="Plan & Subscription"
      title="Plans & Pricing"
      subtitle="Compare Starter, Professional, Agency, and Enterprise. Tax-inclusive at checkout."
    >
      {!snap.billingReady ? (
        <BillingAlert>
          Stripe is not configured yet — plan selection opens checkout once
          price IDs are set.
        </BillingAlert>
      ) : null}
      <PlansCompare currentPlan={snap.plan} billingReady={snap.billingReady} />
    </BillingShell>
  );
}
