import { BillingShell } from "@/components/billing/billing-ui";
import { BillingSettingsForm } from "@/components/billing/billing-forms";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import { loadBillingSnapshot } from "@/lib/billing/snapshot";

/** Route: /billing/settings */
export default async function BillingSettingsPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const profile = {
    ...snap.profile,
    billingEmail: snap.profile.billingEmail || ctx.userEmail,
  };

  return (
    <BillingShell
      icon="gear"
      eyebrow="Billing & Payments"
      title="Billing Settings"
      subtitle="Invoice preferences and notification defaults."
    >
      <BillingSettingsForm
        initial={profile}
        canEdit={canManageBilling(ctx)}
      />
    </BillingShell>
  );
}
