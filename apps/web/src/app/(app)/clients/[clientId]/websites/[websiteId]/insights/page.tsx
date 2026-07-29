import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { InsightsStudio } from "@/components/insights/insights-studio";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { loadInsights } from "@/lib/insights/service";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/insights
 *
 * AI-detected opportunities from reports, leads and site configuration.
 */
export default async function InsightsPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const site = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({
        id: websites.id,
        name: websites.name,
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site) notFound();

  const snapshot = await loadInsights(
    ctx.agencyId,
    websiteId,
    clientId,
    site.settings?.insights,
  );

  if (!snapshot) notFound();

  return (
    <InsightsStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      snapshot={snapshot}
      initial={site.settings?.insights}
    />
  );
}
