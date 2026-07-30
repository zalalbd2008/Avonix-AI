import { PageHeader } from "@/components/shell/page-header";
import { FormIcon } from "@/components/forms/icons";
import { requireAgency } from "@/lib/auth/session";
import { listMyMarketplacePurchases } from "@/lib/forms/marketplace-billing";
import {
  listMarketplaceCatalog,
  listMyMarketplaceInstalls,
} from "@/lib/forms/marketplace-service";
import { MarketplaceClient } from "./marketplace-client";

/**
 * Route: /marketplace
 *
 * Platform + community form template marketplace (ADR-008).
 * Free install or Stripe Checkout for premium listings.
 */
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    purchased?: string;
    canceled?: string;
    session_id?: string;
  }>;
}) {
  const ctx = await requireAgency();
  const sp = await searchParams;
  const [cards, installedIds, purchasedIds] = await Promise.all([
    listMarketplaceCatalog(ctx.agencyId, { q: sp.q }),
    listMyMarketplaceInstalls(ctx.agencyId),
    listMyMarketplacePurchases(ctx.agencyId),
  ]);

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle={`${ctx.agencyName} · free & paid templates`}
      />

      <div className="mb-4 rounded-xl border border-[#edf0f5] bg-[#f8fafc] px-4 py-3 text-[13px] text-muted">
        <p className="flex items-start gap-2">
          <FormIcon name="pack" size="sm" className="mt-0.5 shrink-0 text-brand" />
          <span>
            Browse official Avonix packs and community listings. Free templates
            install instantly; paid ones use Stripe Checkout. Installs copy the
            snapshot into your library — sellers never get live access to your
            tenant. Platform fee is ledgered for future seller payouts.
          </span>
        </p>
      </div>

      <MarketplaceClient
        cards={cards}
        installedIds={installedIds}
        purchasedIds={purchasedIds}
        currentRole={ctx.role}
        agencyId={ctx.agencyId}
        agencyName={ctx.agencyName}
        initialQuery={sp.q ?? ""}
        purchasedFlash={sp.purchased === "1"}
        canceledFlash={sp.canceled === "1"}
        sessionId={sp.session_id}
      />
    </div>
  );
}
