import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { CtaManager } from "@/components/cta/cta-manager";
import { requireAgency } from "@/lib/auth/session";
import { listCtaButtonTemplates, listCtaGroupsForWebsite } from "@/lib/cta/cta-service";
import { listPopupsForWebsite } from "@/lib/popup/popup-service";
import { withAgency } from "@/lib/db";
import { forms, websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/buttons
 *
 * Button Design Studio (ADR-009).
 */
export default async function WebsiteButtonsPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id, name: websites.name })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.clientId, clientId)))
      .limit(1);
    if (!site) return null;

    const formRows = await tx
      .select({
        id: forms.id,
        name: forms.name,
        settings: forms.settings,
      })
      .from(forms)
      .where(
        and(
          eq(forms.websiteId, websiteId),
          eq(forms.clientId, clientId),
          isNull(forms.deletedAt),
        ),
      )
      .orderBy(desc(forms.updatedAt))
      .limit(100);

    return { site, formRows };
  });

  if (!data) notFound();

  const realPopups = await listPopupsForWebsite(ctx.agencyId, websiteId);
  const popupOptions = realPopups
    .filter((p) => p.status !== "archived")
    .map((p) => ({
      id: p.id,
      name: `[Popup] ${p.name}`,
    }));

  const seen = new Set(popupOptions.map((p) => p.id));
  for (const f of data.formRows) {
    if (!seen.has(f.id)) {
      popupOptions.push({ id: f.id, name: `[Form] ${f.name}` });
      seen.add(f.id);
    }
  }

  const [groups, templateRows] = await Promise.all([
    listCtaGroupsForWebsite(ctx.agencyId, websiteId),
    listCtaButtonTemplates(ctx.agencyId, {
      userId: ctx.userId,
      websiteId,
    }),
  ]);
  const initialGroups = groups.map((g) => ({
    ...g,
    createdAt: g.createdAt.toISOString() as unknown as Date,
    updatedAt: g.updatedAt.toISOString() as unknown as Date,
    deletedAt: (g.deletedAt?.toISOString() ?? null) as unknown as Date | null,
    buttons: g.buttons.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString() as unknown as Date,
      updatedAt: b.updatedAt.toISOString() as unknown as Date,
      deletedAt: (b.deletedAt?.toISOString() ?? null) as unknown as Date | null,
    })),
  }));

  const initialTemplates = templateRows.map((t) => ({
    id: t.id,
    name: t.name,
    scope: t.scope,
    status: t.status,
  }));

  return (
    <div>
      <CtaManager
        clientId={clientId}
        websiteId={websiteId}
        websiteName={data.site.name}
        initialGroups={initialGroups}
        popupOptions={popupOptions}
        initialTemplates={initialTemplates}
        memberRole={ctx.role}
      />
    </div>
  );
}
