import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { IntegrationsStudio } from "@/components/integrations/integrations-studio";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { loadIntegrationsSnapshot } from "@/lib/integrations/service";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/integrations
 *
 * Three-layer integration hub — core (offline), optional webhooks/API keys,
 * and enterprise cloud add-ons.
 */
export default async function IntegrationsPage({
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
        url: websites.url,
        status: websites.status,
        connectorVersion: websites.connectorVersion,
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site) notFound();

  const snapshot = loadIntegrationsSnapshot({
    website: {
      id: site.id,
      name: site.name,
      url: site.url,
      status: site.status,
      connectorVersion: site.connectorVersion,
    },
    clientId,
    settings: site.settings,
  });

  return (
    <IntegrationsStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      snapshot={snapshot}
      initial={site.settings?.integrations}
    />
  );
}
