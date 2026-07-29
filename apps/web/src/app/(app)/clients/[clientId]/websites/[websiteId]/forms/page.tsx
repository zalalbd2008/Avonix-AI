import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { FormListRow } from "@/components/forms/form-list-row";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { formSubmissions, forms, websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/forms
 *
 * Forms scoped to this website — subtitle matches the prototype: "Forms shown
 * on this website only".
 */
export default async function WebsiteFormsPage({
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

    const rows = await tx
      .select({
        id: forms.id,
        formNumber: forms.formNumber,
        name: forms.name,
        fields: forms.fields,
        createdAt: forms.createdAt,
        isPublished: forms.isPublished,
        submissions: count(formSubmissions.id),
      })
      .from(forms)
      .leftJoin(formSubmissions, eq(formSubmissions.formId, forms.id))
      .where(
        and(
          eq(forms.clientId, clientId),
          eq(forms.websiteId, websiteId),
          isNull(forms.deletedAt),
        ),
      )
      .groupBy(forms.id)
      .orderBy(desc(forms.createdAt));

    return { site, rows };
  });

  if (!data) notFound();

  const newHref = `/clients/${clientId}/websites/${websiteId}/forms/new`;

  return (
    <div>
      <PageHeader
        title="Forms"
        subtitle="Forms shown on this website only"
        action={
          <Link
            href={newHref as never}
            className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + New Form
          </Link>
        }
      />

      {data.rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No forms on {data.site.name} yet</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted">
            Build a liquid, responsive form with a live preview. Paste the embed
            into this site — submissions become contacts in the inbox.
          </p>
          <Link
            href={newHref as never}
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            Open form builder →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.rows.map((f) => (
            <FormListRow
              key={f.id}
              clientId={clientId}
              websiteId={websiteId}
              form={{
                id: f.id,
                formNumber: f.formNumber,
                name: f.name,
                fieldCount: f.fields.length,
                submissions: f.submissions,
                isPublished: f.isPublished,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
