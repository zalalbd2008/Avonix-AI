import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CrmModuleStudio } from "@/components/crm/crm-module-studio";
import { loadCrmModuleData } from "@/lib/crm/ops-actions";
import { CRM_SLUG_TO_ID } from "@/lib/crm/modules";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

export default async function WebsiteCrmModulePage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string; module: string }>;
}) {
  const { clientId, websiteId, module: slug } = await params;
  const moduleId = CRM_SLUG_TO_ID[slug];
  if (!moduleId) notFound();

  if (moduleId === "inbox") {
    redirect(`/clients/${clientId}/websites/${websiteId}/conversations`);
  }

  const ctx = await requireAgency();
  const [site] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ name: websites.name })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.clientId, clientId)))
      .limit(1),
  );
  if (!site) notFound();

  const data = await loadCrmModuleData(clientId, websiteId, moduleId);

  return (
    <CrmModuleStudio
      clientId={clientId}
      websiteId={websiteId}
      moduleId={moduleId}
      websiteName={site.name}
      initial={data}
    />
  );
}
