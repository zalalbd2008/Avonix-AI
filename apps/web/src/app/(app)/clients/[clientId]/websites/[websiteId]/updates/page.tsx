import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { UpdatesStudio } from "@/components/updates/updates-studio";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/updates
 *
 * Update watching + connector status for this website.
 */
export default async function WebsiteUpdatesPage({
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
        lastSeenAt: websites.lastSeenAt,
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site) notFound();

  return (
    <UpdatesStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      websiteUrl={site.url}
      websiteStatus={site.status}
      connectorVersion={site.connectorVersion}
      lastSeenAt={site.lastSeenAt}
      initial={site.settings?.updates}
    />
  );
}
