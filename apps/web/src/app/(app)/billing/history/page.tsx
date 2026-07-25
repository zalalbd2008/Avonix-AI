import { PortalActionButton } from "@/components/billing-actions";
import {
  BillingCard,
  BillingShell,
  EmptyTable,
  StatusPill,
} from "@/components/billing/billing-ui";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import { loadStripeCharges } from "@/lib/billing/customer-data";
import { formatBillingDate, loadBillingSnapshot } from "@/lib/billing/snapshot";

/** Route: /billing/history */
export default async function BillingHistoryPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const charges = await loadStripeCharges(ctx.agencyId);
  const canEdit = canManageBilling(ctx);

  return (
    <BillingShell
      icon="history"
      eyebrow="Billing & Payments"
      title="Billing History"
      subtitle="Date, amount, method, status, and receipt."
      action={
        <PortalActionButton
          label="Open Stripe history"
          disabled={!snap.hasStripeCustomer || !canEdit}
        />
      }
    >
      <BillingCard icon="history">
        {charges.length === 0 ? (
          <EmptyTable message="No transactions yet. After your first Stripe charge, history lists here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8edf5] text-[12px] text-muted">
                  <th className="pb-2.5 pr-4 font-medium">Date</th>
                  <th className="pb-2.5 pr-4 font-medium">Amount</th>
                  <th className="pb-2.5 pr-4 font-medium">Method</th>
                  <th className="pb-2.5 pr-4 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((ch) => (
                  <tr key={ch.id} className="border-b border-[#f1f5f9] last:border-0">
                    <td className="py-3 pr-4 text-ink">
                      {formatBillingDate(ch.date)}
                    </td>
                    <td className="py-3 pr-4 font-medium text-ink">{ch.amount}</td>
                    <td className="py-3 pr-4 capitalize text-muted">{ch.method}</td>
                    <td className="py-3 pr-4">
                      <StatusPill
                        tone={
                          ch.status === "succeeded"
                            ? "ok"
                            : ch.status === "failed"
                              ? "bad"
                              : "muted"
                        }
                      >
                        {ch.status}
                      </StatusPill>
                    </td>
                    <td className="py-3">
                      {ch.receiptUrl ? (
                        <a
                          href={ch.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-brand hover:underline"
                        >
                          Receipt
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </BillingCard>
    </BillingShell>
  );
}
