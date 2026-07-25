import { PortalActionButton } from "@/components/billing-actions";
import {
  BillingCard,
  BillingShell,
  StatusPill,
} from "@/components/billing/billing-ui";
import { PaymentMethodsPanel } from "@/components/billing/payment-methods-panel";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import { loadStripePaymentMethods } from "@/lib/billing/customer-data";
import { loadBillingSnapshot } from "@/lib/billing/snapshot";

/** Route: /billing/payment-methods */
export default async function PaymentMethodsPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const methods = await loadStripePaymentMethods(ctx.agencyId);
  const canEdit = canManageBilling(ctx);

  return (
    <BillingShell
      icon="card"
      eyebrow="Billing & Payments"
      title="Payment Methods"
      subtitle="Cards are stored by Stripe — never as API keys in Avonix."
      action={
        <PortalActionButton
          label="Open Stripe portal"
          variant="primary"
          disabled={!snap.hasStripeCustomer || !canEdit}
        />
      }
    >
      <BillingCard title="Cards" subtitle="Visa · Mastercard · Amex" icon="card">
        <PaymentMethodsPanel methods={methods} canEdit={canEdit} />
      </BillingCard>

      <BillingCard title="Wallets" icon="wallet">
        <div className="divide-y divide-[#f1f5f9]">
          <WalletRow
            name="PayPal"
            note="Not connected yet — Stripe is the system of record."
            badge="Soon"
          />
          <WalletRow name="Apple Pay" note="Future" badge="Future" />
          <WalletRow name="Google Pay" note="Future" badge="Future" />
        </div>
      </BillingCard>
    </BillingShell>
  );
}

function WalletRow({
  name,
  note,
  badge,
}: {
  name: string;
  note: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-[13px] font-medium text-ink">{name}</p>
        <p className="text-[12px] text-muted">{note}</p>
      </div>
      <StatusPill tone="muted">{badge}</StatusPill>
    </div>
  );
}
