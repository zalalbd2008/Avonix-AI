import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { forms, websites } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { listPopupsForWebsite, listPopupTemplates } from "@/lib/popup/popup-service";
import { PopupDesignStudio } from "@/components/popup/popup-design-studio";

/**
 * Popup Studio (ADR-010) — Visual Experience Builder.
 */
export default async function PopupStudioPage({
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
      .where(
        and(
          eq(websites.id, websiteId),
          eq(websites.clientId, clientId),
          isNull(websites.deletedAt),
        ),
      )
      .limit(1);
    if (!site) return null;

    const formRows = await tx
      .select({
        id: forms.id,
        name: forms.name,
        formNumber: forms.formNumber,
        updatedAt: forms.updatedAt,
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
      .limit(200);

    return { site, formRows };
  });

  if (!data) notFound();

  const [rows, templateRows] = await Promise.all([
    listPopupsForWebsite(ctx.agencyId, websiteId),
    listPopupTemplates(ctx.agencyId, {
      userId: ctx.userId,
      websiteId,
    }),
  ]);
  const initialPopups = rows.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString() as unknown as Date,
    updatedAt: p.updatedAt.toISOString() as unknown as Date,
    deletedAt: (p.deletedAt?.toISOString() ?? null) as unknown as Date | null,
  }));

  const formOptions = data.formRows.map((f) => ({
    id: f.id,
    name: f.name,
    formNumber: f.formNumber,
    updatedAt: f.updatedAt.toISOString(),
  }));

  const initialTemplates = templateRows.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    description: t.description,
    scope: t.scope,
    status: t.status,
    updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <PopupDesignStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={data.site.name}
      initialPopups={initialPopups}
      formOptions={formOptions}
      initialTemplates={initialTemplates}
      memberRole={ctx.role}
    />
  );
}
