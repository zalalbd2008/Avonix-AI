import { PortalActionButton } from "@/components/billing-actions";
import {
  BillingCard,
  BillingShell,
  ComingSoonBanner,
} from "@/components/billing/billing-ui";
import { BillingIcon } from "@/components/billing/billing-icons";
import { requireAgency } from "@/lib/auth/session";
import { ADDON_CATALOG } from "@/lib/billing/catalog";
import { loadBillingSnapshot } from "@/lib/billing/snapshot";

/** Route: /billing/addons */
export default async function AddonsPage() {
  const ctx = await requireAgency();
  const snap = await loadBillingSnapshot(ctx.agencyId);

  return (
    <BillingShell
      icon="spark"
      eyebrow="Plan & Subscription"
      title="Add-ons"
      subtitle="Optional capacity packs and extensions (V2)."
    >
      <ComingSoonBanner feature="Add-ons" />
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ADDON_CATALOG.map((addon) => (
          <BillingCard key={addon.id}>
            <div className="mb-3 grid size-9 place-items-center rounded-lg bg-[#f1f5f9] text-muted">
              <BillingIcon name="spark" className="size-4" />
            </div>
            <h3 className="text-[14px] font-semibold text-ink">{addon.name}</h3>
            <p className="mt-1 text-[13px] text-muted">{addon.detail}</p>
            <button
              type="button"
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-lg bg-[#f1f5f9] py-2 text-[13px] font-semibold text-faint"
            >
              Coming in V2
            </button>
          </BillingCard>
        ))}
      </div>
      {snap.hasStripeCustomer ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          <span>Until add-ons ship, upgrade your plan for more capacity.</span>
          <PortalActionButton label="Manage in Stripe" />
        </div>
      ) : null}
    </BillingShell>
  );
}
