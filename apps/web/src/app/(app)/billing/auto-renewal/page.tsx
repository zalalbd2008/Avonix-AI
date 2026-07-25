import {
  BillingCard,
  BillingShell,
  InfoRow,
  StatusPill,
} from "@/components/billing/billing-ui";
import { AutoRenewalToggle } from "@/components/billing/auto-renewal-toggle";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import {
  formatBillingDate,
  loadBillingSnapshot,
} from "@/lib/billing/snapshot";

/** Route: /billing/auto-renewal */
export default async function AutoRenewalPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const enabled = !snap.cancelling && snap.hasSubscription;

  return (
    <BillingShell
      icon="refresh"
      eyebrow="Billing & Payments"
      title="Auto Renewal"
      subtitle="Renewal, reminders, retries, and grace period."
    >
      <BillingCard title="Auto renewal" icon="refresh">
        <AutoRenewalToggle
          enabled={enabled}
          canEdit={canManageBilling(ctx)}
          hasSubscription={snap.hasSubscription}
        />
        <div className="mt-3">
          <InfoRow
            icon="calendar"
            label={enabled ? "Next renewal" : "Ends"}
            value={formatBillingDate(
              enabled ? snap.renewalDate : snap.planExpires,
            )}
          />
        </div>
      </BillingCard>

      <div className="grid gap-6 sm:grid-cols-3">
        <BillingCard title="Renewal reminder" icon="mail">
          <p className="text-[13px] leading-relaxed text-muted">
            Uses billing email
            {snap.profile.billingEmail
              ? ` (${snap.profile.billingEmail})`
              : ""}
            .
          </p>
          <div className="mt-3">
            <StatusPill tone="muted">7 days before</StatusPill>
          </div>
        </BillingCard>

        <BillingCard title="Payment retry" icon="refresh">
          <p className="text-[13px] leading-relaxed text-muted">
            {snap.status === "past_due"
              ? "Stripe is retrying a failed payment."
              : "No failed retries in progress."}
          </p>
          <div className="mt-3">
            <StatusPill tone={snap.status === "past_due" ? "warn" : "ok"}>
              {snap.status === "past_due" ? "Retrying" : "Healthy"}
            </StatusPill>
          </div>
        </BillingCard>

        <BillingCard title="Grace period" icon="shield">
          <p className="text-[13px] leading-relaxed text-muted">
            Access stays active while Stripe retries. Owner suspend applies
            immediately.
          </p>
          <div className="mt-3">
            <StatusPill tone={snap.overrides.suspended ? "bad" : "ok"}>
              {snap.overrides.suspended ? "Suspended" : "Not in grace"}
            </StatusPill>
          </div>
        </BillingCard>
      </div>
    </BillingShell>
  );
}
