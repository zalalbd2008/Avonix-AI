import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AuditLogStudio } from "@/components/audit-log/audit-log-studio";
import { requireAgency } from "@/lib/auth/session";
import { loadAuditLogSnapshot } from "@/lib/audit-log/service";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/audit-log
 *
 * Append-only audit trail for agency and connector actions on this website.
 */
export default async function AuditLogPage({
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
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site) notFound();

  const snapshot = loadAuditLogSnapshot({
    website: {
      id: site.id,
      name: site.name,
      url: site.url,
      status: site.status,
    },
    settings: site.settings,
  });

  return (
    <AuditLogStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      snapshot={snapshot}
      initial={site.settings?.auditLog}
    />
  );
}
