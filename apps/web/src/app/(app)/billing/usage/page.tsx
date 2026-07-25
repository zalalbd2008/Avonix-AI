import { UpgradeButton } from "@/components/billing-actions";
import {
  BillingAlert,
  BillingCard,
  BillingShell,
  UsageMeter,
} from "@/components/billing/billing-ui";
import { requireAgency } from "@/lib/auth/session";
import { loadBillingSnapshot } from "@/lib/billing/snapshot";
import { nextUpgradeablePlan } from "@/lib/plans";

/** Route: /billing/usage */
export default async function UsageLimitsPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const upgradePlan = nextUpgradeablePlan(snap.plan);
  const near =
    snap.usage.clients.used / Math.max(snap.usage.clients.limit, 1) >= 0.8 ||
    snap.usage.websites.used / Math.max(snap.usage.websites.limit, 1) >= 0.8 ||
    snap.usage.users.used / Math.max(snap.usage.users.limit, 1) >= 0.8;

  return (
    <BillingShell
      icon="chart"
      eyebrow="Plan & Subscription"
      title="Usage & Limits"
      subtitle="Live usage against your plan. Warnings at 80% and when a limit is hit."
      action={
        upgradePlan ? (
          <UpgradeButton
            plan={upgradePlan}
            label="Upgrade plan"
            disabled={!snap.billingReady}
            className=""
          />
        ) : undefined
      }
    >
      {near ? (
        <BillingAlert>
          <b>Limit warning.</b> You are close to capacity on one or more
          resources.
        </BillingAlert>
      ) : null}

      <BillingCard title="Live usage" icon="chart">
        <UsageMeter
          icon="building"
          label="Workspaces"
          used={snap.usage.clients.used}
          limit={snap.usage.clients.limit}
        />
        <UsageMeter
          icon="globe"
          label="Websites"
          used={snap.usage.websites.used}
          limit={snap.usage.websites.limit}
        />
        <UsageMeter
          icon="users"
          label="Users"
          used={snap.usage.users.used}
          limit={snap.usage.users.limit}
        />
        <UsageMeter
          icon="spark"
          label="AI credits"
          used={snap.usage.ai.used}
          limit={snap.usage.ai.limit}
        />
      </BillingCard>
    </BillingShell>
  );
}
