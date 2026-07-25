import Link from "next/link";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { limitsFor } from "@/lib/plans";

/**
 * Route: /settings/branding
 *
 * White-label is a v2 feature (ADR-003). The agency row already carries the
 * branding columns, so turning this on later is an addition rather than a
 * migration — which is worth saying here, because it is the reason the page
 * exists at all instead of being hidden from the menu.
 */
export default async function BrandingPage() {
  const ctx = await requireAgency();

  const [agency] = await withAgency(ctx.agencyId, (tx) =>
    tx.select({ plan: agencies.plan }).from(agencies).where(eq(agencies.id, ctx.agencyId)).limit(1),
  );
  const limits = limitsFor(agency.plan);

  return (
    <div className="max-w-2xl">
      <PageHeader title="Branding" subtitle="Your name on the dashboard your clients see" />

      <div className="mb-4 rounded-xl border border-line bg-white p-5">
        <p className="mb-2 text-[13.5px] font-semibold">White-label is not built yet</p>
        <p className="text-[13px] leading-[1.6] text-muted">
          The plan: your logo, your colours and your own domain on the dashboard,
          plus logins you can hand to your clients so they see their own inbox
          rather than yours. Deferred to v2 under ADR-003 — the first ten
          customers need the product to work, not to be re-skinned.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          On your plan
        </h2>
        <div className="flex items-center gap-3 px-4 py-3.5 text-[13px]">
          <span
            className={`size-1.5 shrink-0 rounded-full ${limits.whiteLabel ? "bg-ok" : "bg-[#c9d2de]"}`}
          />
          <span className="text-muted">
            {limits.whiteLabel
              ? `${limits.label} includes white-label — it will be switched on here when built.`
              : `${limits.label} does not include white-label. It is part of the Agency plan.`}
          </span>
        </div>
      </div>

      <Link href="/settings" className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline">
        ← Back to settings
      </Link>
    </div>
  );
}
