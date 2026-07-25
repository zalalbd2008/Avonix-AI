import { PageHeader } from "@/components/shell/page-header";
import { FormIcon } from "@/components/forms/icons";
import { requireAgency } from "@/lib/auth/session";
import {
  listMarketplaceCatalog,
  listMyMarketplaceInstalls,
} from "@/lib/forms/marketplace-service";
import { MarketplaceClient } from "./marketplace-client";

/**
 * Route: /marketplace
 *
 * Platform + community form template marketplace (ADR-008).
 * Install copies a listing snapshot into this organization's library.
 */
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireAgency();
  const sp = await searchParams;
  const [cards, installedIds] = await Promise.all([
    listMarketplaceCatalog(ctx.agencyId, { q: sp.q }),
    listMyMarketplaceInstalls(ctx.agencyId),
  ]);

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle={`${ctx.agencyName} · official packs · community listings`}
      />

      <div className="mb-4 rounded-xl border border-[#edf0f5] bg-[#f8fafc] px-4 py-3 text-[13px] text-muted">
        <p className="flex items-start gap-2">
          <FormIcon name="pack" size="sm" className="mt-0.5 shrink-0 text-brand" />
          <span>
            Browse official Avonix packs and community listings. Install copies
            the snapshot into your organization library — sellers never get
            live access to your tenant (ADR-008).
          </span>
        </p>
      </div>

      <MarketplaceClient
        cards={cards}
        installedIds={installedIds}
        currentRole={ctx.role}
        agencyName={ctx.agencyName}
        initialQuery={sp.q ?? ""}
      />
    </div>
  );
}
