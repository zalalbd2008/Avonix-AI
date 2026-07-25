import { BillingShell } from "@/components/billing/billing-ui";
import { TaxBusinessForm } from "@/components/billing/billing-forms";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import { loadBillingSnapshot } from "@/lib/billing/snapshot";

/** Route: /billing/tax */
export default async function TaxBusinessPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const profile = {
    ...snap.profile,
    companyName: snap.profile.companyName || snap.agencyName,
    billingEmail: snap.profile.billingEmail || ctx.userEmail,
  };

  return (
    <BillingShell
      icon="building"
      eyebrow="Billing & Payments"
      title="Tax & Business Info"
      subtitle="US invoices and tax-exempt notes. Checkout stays tax-inclusive."
    >
      <TaxBusinessForm initial={profile} canEdit={canManageBilling(ctx)} />
    </BillingShell>
  );
}
