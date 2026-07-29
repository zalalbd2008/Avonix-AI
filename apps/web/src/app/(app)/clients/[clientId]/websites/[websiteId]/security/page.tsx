import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { SecurityStudio } from "@/components/security/security-studio";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { loadSecuritySnapshot } from "@/lib/security/service";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/security
 *
 * Security monitor — hardening toggles, scan queue and posture checks.
 */
export default async function SecurityPage({
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

  const snapshot = loadSecuritySnapshot({
    website: {
      id: site.id,
      name: site.name,
      url: site.url,
      status: site.status,
      connectorVersion: site.connectorVersion,
      lastSeenAt: site.lastSeenAt,
    },
    settings: site.settings,
  });

  return (
    <SecurityStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      snapshot={snapshot}
      initial={site.settings?.security}
    />
  );
}
