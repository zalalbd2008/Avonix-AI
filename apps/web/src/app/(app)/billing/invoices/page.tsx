import { PortalActionButton } from "@/components/billing-actions";
import {
  BillingCard,
  BillingShell,
  EmptyTable,
  StatusPill,
} from "@/components/billing/billing-ui";
import { requireAgency } from "@/lib/auth/session";
import { canManageBilling } from "@/lib/billing/access";
import { loadStripeInvoices } from "@/lib/billing/customer-data";
import { formatBillingDate, loadBillingSnapshot } from "@/lib/billing/snapshot";

/** Route: /billing/invoices */
export default async function InvoicesPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);
  const invoices = await loadStripeInvoices(ctx.agencyId);
  const canEdit = canManageBilling(ctx);

  return (
    <BillingShell
      icon="invoice"
      eyebrow="Billing & Payments"
      title="Invoices"
      subtitle="Number, date, plan, amount, tax, PDF / print / email."
      action={
        <PortalActionButton
          label="View in Stripe"
          disabled={!snap.hasStripeCustomer || !canEdit}
        />
      }
    >
      <BillingCard icon="invoice">
        {invoices.length === 0 ? (
          <EmptyTable message="No invoices yet. Tax-inclusive at checkout; invoices still show a tax line when Stripe Tax applies." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#e8edf5] text-[12px] text-muted">
                  <th className="pb-2.5 pr-4 font-medium">Invoice #</th>
                  <th className="pb-2.5 pr-4 font-medium">Date</th>
                  <th className="pb-2.5 pr-4 font-medium">Plan</th>
                  <th className="pb-2.5 pr-4 font-medium">Amount</th>
                  <th className="pb-2.5 pr-4 font-medium">Tax</th>
                  <th className="pb-2.5 pr-4 font-medium">Status</th>
                  <th className="pb-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#f1f5f9] last:border-0">
                    <td className="py-3 pr-4 font-medium text-ink">
                      {inv.number ?? inv.id}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {formatBillingDate(inv.date)}
                    </td>
                    <td className="py-3 pr-4 text-ink">{inv.planLabel}</td>
                    <td className="py-3 pr-4 font-medium text-ink">
                      {inv.amount}
                    </td>
                    <td className="py-3 pr-4 text-muted">{inv.tax}</td>
                    <td className="py-3 pr-4">
                      <StatusPill
                        tone={
                          inv.status === "paid"
                            ? "ok"
                            : inv.status === "open"
                              ? "warn"
                              : "muted"
                        }
                      >
                        {inv.status}
                      </StatusPill>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-3">
                        {inv.pdfUrl ? (
                          <a
                            href={inv.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-brand hover:underline"
                          >
                            PDF
                          </a>
                        ) : null}
                        {inv.hostedUrl ? (
                          <>
                            <a
                              href={inv.hostedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-brand hover:underline"
                            >
                              Print
                            </a>
                            <a
                              href={inv.hostedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-brand hover:underline"
                            >
                              Email
                            </a>
                          </>
                        ) : null}
                      </div>
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
