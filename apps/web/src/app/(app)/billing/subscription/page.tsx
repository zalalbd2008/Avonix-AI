import {
  ManageBillingButton,
  PortalActionButton,
  SwitchIntervalButton,
  UpgradeButton,
} from "@/components/billing-actions";
import {
  BillingCard,
  BillingShell,
  InfoRow,
  StatusPill,
} from "@/components/billing/billing-ui";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import { catalogForAgencyPlan, formatMoney } from "@/lib/billing/catalog";
import {
  formatBillingDate,
  loadBillingSnapshot,
  type BillingStatus,
} from "@/lib/billing/snapshot";
import { nextUpgradeablePlan } from "@/lib/plans";

function statusTone(status: BillingStatus): "ok" | "warn" | "bad" | "muted" {
  if (status === "active" || status === "trialing") return "ok";
  if (status === "past_due" || status === "cancelling") return "warn";
  if (status === "suspended" || status === "expired") return "bad";
  return "muted";
}

/** Route: /billing/subscription */
export default async function SubscriptionPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const canEdit = canManageBilling(ctx);
  const upgradePlan = nextUpgradeablePlan(snap.plan);
  const canUpgrade = Boolean(upgradePlan);
  const catalog = catalogForAgencyPlan(snap.plan);
  const price =
    !snap.hasSubscription
      ? null
      : snap.billingCycle === "year"
        ? catalog.yearlyPrice
        : catalog.monthlyPrice;

  return (
    <BillingShell
      icon="plan"
      eyebrow="Plan & Subscription"
      title="Subscription"
      subtitle="Current plan and change actions"
      action={
        snap.hasStripeCustomer && canEdit ? <ManageBillingButton /> : undefined
      }
    >
      <BillingCard>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[12px] text-muted">Current plan</p>
            <h2 className="mt-0.5 text-[24px] font-bold text-ink">
              {snap.catalogLabel}
            </h2>
            <p className="mt-1 text-[18px] font-semibold text-ink">
              {formatMoney(
                price,
                snap.billingCycle === "year" ? "year" : "month",
              )}
            </p>
          </div>
          <StatusPill tone={statusTone(snap.status)}>
            {snap.statusLabel}
          </StatusPill>
        </div>

        <InfoRow
          icon="calendar"
          label="Renews"
          value={formatBillingDate(snap.renewalDate)}
        />
        <InfoRow
          icon="check"
          label="Status"
          value={snap.statusLabel}
        />
        <InfoRow icon="money" label="Next charge" value={snap.nextCharge} />

        <div className="mt-5 flex flex-wrap gap-2 border-t border-[#e8edf5] pt-4">
          {canUpgrade && upgradePlan && canEdit ? (
            <UpgradeButton
              plan={upgradePlan}
              label="Upgrade"
              disabled={!snap.billingReady}
              className=""
            />
          ) : null}
          <PortalActionButton
            label="Downgrade"
            disabled={!snap.hasStripeCustomer || !canEdit}
          />
          {snap.billingCycle !== "year" ? (
            <SwitchIntervalButton
              interval="year"
              label="Switch to Annual"
              disabled={!snap.hasSubscription || !canEdit}
            />
          ) : (
            <SwitchIntervalButton
              interval="month"
              label="Switch to Monthly"
              disabled={!snap.hasSubscription || !canEdit}
            />
          )}
          <PortalActionButton
            label="Cancel"
            variant="danger"
            disabled={!snap.hasStripeCustomer || !canEdit}
          />
        </div>
      </BillingCard>
    </BillingShell>
  );
}
