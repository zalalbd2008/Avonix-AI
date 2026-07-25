import {
  BillingCard,
  BillingShell,
  ComingSoonBanner,
} from "@/components/billing/billing-ui";
import { BillingIcon } from "@/components/billing/billing-icons";
import { requireAgency } from "@/lib/auth/session";

/** Route: /billing/coupons */
export default async function CouponsPage() {
  await requireAgency();

  return (
    <BillingShell
      icon="tag"
      eyebrow="Billing & Payments"
      title="Coupons"
      subtitle="Promotion codes at checkout work today. In-app wallet is V2."
    >
      <ComingSoonBanner feature="In-app coupon wallet" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Apply coupon",
            body: "Stripe Checkout accepts promotion codes when you upgrade from Plans & Pricing.",
            soon: false,
          },
          {
            title: "Redeem credit",
            body: "Account credit balance redemptions will appear here in V2.",
            soon: true,
          },
          {
            title: "Promotional offer",
            body: "Time-bound partner offers managed by Avonix — V2.",
            soon: true,
          },
        ].map((card) => (
          <BillingCard key={card.title}>
            <div className="mb-3 grid size-9 place-items-center rounded-lg bg-[#f1f5f9] text-muted">
              <BillingIcon name="tag" className="size-4" />
            </div>
            <h3 className="text-[14px] font-semibold text-ink">{card.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              {card.body}
            </p>
            {card.soon ? (
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-lg bg-[#f1f5f9] py-2 text-[13px] font-semibold text-faint"
              >
                Coming in V2
              </button>
            ) : null}
          </BillingCard>
        ))}
      </div>
    </BillingShell>
  );
}
