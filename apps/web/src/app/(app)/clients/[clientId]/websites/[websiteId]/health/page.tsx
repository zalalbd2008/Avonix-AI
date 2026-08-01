import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { HealthStudio } from "@/components/health/health-studio";
import { requireAgency } from "@/lib/auth/session";
import { configuredAiProviders } from "@/lib/ai/router";
import { withAgency } from "@/lib/db";
import { knowledgeChunks, websites } from "@/lib/db/schema";
import { buildHealthSnapshot } from "@/lib/health/types";
import { mergeUpdatesSettings } from "@/lib/updates/types";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/health
 *
 * Overall health score and checks aggregated from live module configuration.
 */
export default async function HealthPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select({
        id: websites.id,
        name: websites.name,
        url: websites.url,
        status: websites.status,
        connectorVersion: websites.connectorVersion,
        lastSeenAt: websites.lastSeenAt,
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    if (!site) return null;

    const [[chunks], providers] = await Promise.all([
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.websiteId, websiteId),
            eq(knowledgeChunks.agencyId, ctx.agencyId),
          ),
        ),
      configuredAiProviders(),
    ]);

    const updates = mergeUpdatesSettings(site.settings?.updates);
    const pendingUpdates = updates.inventory.filter(
      (i) => i.updateAvailable,
    ).length;

    const snapshot = buildHealthSnapshot({
      clientId,
      website: {
        id: site.id,
        name: site.name,
        url: site.url,
        status: site.status,
        connectorVersion: site.connectorVersion,
        lastSeenAt: site.lastSeenAt,
      },
      settings: site.settings,
      ai: {
        chunks: chunks?.n ?? 0,
        modelReady: providers.length > 0,
      },
      pendingUpdates,
    });

    return { site, snapshot };
  });

  if (!data) notFound();

  return (
    <HealthStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={data.site.name}
      snapshot={data.snapshot}
    />
  );
}
