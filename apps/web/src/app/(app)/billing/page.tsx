import {
  ManageBillingButton,
  PortalActionButton,
  UpgradeButton,
} from "@/components/billing-actions";
import {
  BillingAlert,
  BillingCard,
  BillingShell,
  InfoRow,
  StatusPill,
  UsageMeter,
} from "@/components/billing/billing-ui";
import { OwnerBillingTools } from "@/components/billing/owner-tools";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import { loadStripeBillingExtras } from "@/lib/billing/customer-data";
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

function cycleLabel(cycle: string) {
  if (cycle === "month") return "Monthly";
  if (cycle === "year") return "Yearly";
  if (cycle === "trial") return "Trial";
  return "—";
}

/** Route: /billing — Overview */
export default async function BillingOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { upgraded } = await searchParams;
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const extras = await loadStripeBillingExtras(ctx.agencyId);
  const canEdit = canManageBilling(ctx);
  const upgradePlan = nextUpgradeablePlan(snap.plan);
  const canUpgrade = Boolean(upgradePlan);

  return (
    <BillingShell
      icon="overview"
      eyebrow="Plan & Subscription"
      title="Overview"
      subtitle={`Subscription summary for ${snap.agencyName}`}
      action={
        snap.hasStripeCustomer && canEdit ? (
          <ManageBillingButton label="Open Stripe portal" />
        ) : undefined
      }
    >
      {upgraded ? (
        <BillingAlert tone="ok">
          Payment received. Your plan updates when Stripe confirms the
          subscription.
        </BillingAlert>
      ) : null}

      {!snap.billingReady ? (
        <BillingAlert>
          <b>Billing is not connected yet.</b> Set Stripe keys and price IDs to
          enable checkout.
        </BillingAlert>
      ) : null}

      {snap.status === "past_due" ? (
        <BillingAlert tone="warn">
          <b>A payment did not go through.</b> Update your card from Payment
          Methods or the Stripe portal.
        </BillingAlert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <BillingCard title="Subscription" icon="plan">
          <InfoRow icon="plan" label="Current plan" value={snap.catalogLabel} />
          <InfoRow
            icon="check"
            label="Status"
            value={
              <StatusPill tone={statusTone(snap.status)}>
                {snap.statusLabel}
              </StatusPill>
            }
          />
          <InfoRow
            icon="calendar"
            label="Billing cycle"
            value={cycleLabel(snap.billingCycle)}
          />
          <InfoRow
            icon="refresh"
            label="Renewal date"
            value={formatBillingDate(snap.renewalDate)}
          />
          <InfoRow icon="money" label="Next charge" value={snap.nextCharge} />
          <InfoRow
            icon="calendar"
            label="Plan started"
            value={formatBillingDate(snap.planStarted)}
          />
          <InfoRow
            icon="calendar"
            label="Plan expires"
            value={formatBillingDate(snap.planExpires)}
          />
        </BillingCard>

        <BillingCard title="Payment" icon="card">
          <InfoRow
            icon="card"
            label="Default payment method"
            value={extras.defaultMethodLabel}
          />
          <InfoRow icon="history" label="Last payment" value={extras.lastPayment} />
          <InfoRow
            icon="calendar"
            label="Next payment"
            value={
              snap.renewalDate ? formatBillingDate(snap.renewalDate) : "—"
            }
          />
          <InfoRow
            icon="money"
            label="Outstanding balance"
            value={extras.outstandingBalance}
          />
          <InfoRow
            icon="refresh"
            label="Auto renewal"
            value={
              snap.cancelling
                ? "Off (cancelling)"
                : !snap.hasSubscription
                  ? "—"
                  : "On"
            }
          />
        </BillingCard>
      </div>

      <BillingCard title="Quick actions" icon="arrowUp">
        <div className="flex flex-wrap gap-2">
          {canUpgrade && upgradePlan && canEdit ? (
            <UpgradeButton
              plan={upgradePlan}
              label="Upgrade"
              disabled={!snap.billingReady}
              className=""
              interval={snap.billingCycle === "year" ? "year" : "month"}
            />
          ) : null}
          <PortalActionButton
            label="Change plan"
            disabled={!snap.hasStripeCustomer || !canEdit}
          />
          <PortalActionButton
            label="Cancel"
            variant="danger"
            disabled={!snap.hasStripeCustomer || !canEdit}
          />
          <PortalActionButton
            label="Download invoice"
            disabled={!snap.hasStripeCustomer || !canEdit}
          />
          <PortalActionButton
            label="Update payment method"
            disabled={!snap.hasStripeCustomer || !canEdit}
          />
        </div>
        <p className="mt-3 text-[12px] text-muted">
          Choose plan → Stripe Checkout → Payment success → Subscription
          activated. PayPal is not wired yet.
        </p>
      </BillingCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <BillingCard
          title="Usage"
          icon="chart"
          action={
            <a
              href="/billing/usage"
              className="text-[12.5px] font-semibold text-brand hover:underline"
            >
              View all
            </a>
          }
        >
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
        </BillingCard>

        {ctx.role === "owner" ? (
          <BillingCard
            title="Owner tools"
            subtitle="Not visible to members"
            icon="shield"
          >
            <OwnerBillingTools overrides={snap.overrides} />
          </BillingCard>
        ) : (
          <BillingCard title="Need help?" icon="help">
            <p className="text-[13px] leading-relaxed text-muted">
              Plan changes and invoices are managed through Stripe. Ask an
              organization owner if you need billing access.
            </p>
          </BillingCard>
        )}
      </div>
    </BillingShell>
  );
}
