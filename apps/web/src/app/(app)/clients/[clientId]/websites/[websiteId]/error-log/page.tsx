import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ErrorLogStudio } from "@/components/error-log/error-log-studio";
import { requireAgency } from "@/lib/auth/session";
import { loadErrorLogSnapshot } from "@/lib/error-log/service";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/error-log
 *
 * Runtime PHP, JS, database and API errors reported by the connector.
 */
export default async function ErrorLogPage({
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

  const snapshot = loadErrorLogSnapshot({
    website: {
      id: site.id,
      name: site.name,
      url: site.url,
      status: site.status,
      connectorVersion: site.connectorVersion,
    },
    settings: site.settings,
  });

  return (
    <ErrorLogStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      snapshot={snapshot}
      initial={site.settings?.errorLog}
    />
  );
}
