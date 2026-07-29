import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { AutomationStudio } from "@/components/automation/automation-studio";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/automation
 *
 * If → then rules for this website (leads, chat, uptime).
 */
export default async function AutomationPage({
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
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site) notFound();

  return (
    <AutomationStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      websiteUrl={site.url}
      initial={site.settings?.automation}
    />
  );
}
