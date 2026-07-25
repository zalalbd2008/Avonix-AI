import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { FormPreviewClient } from "@/components/forms/form-preview-client";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { forms, websites } from "@/lib/db/schema";
import { DEFAULT_STEP_ID, formShortcode, mergeAppearance } from "@/lib/forms/fields";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/forms/[formId]/preview
 */
export default async function FormPreviewPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string; formId: string }>;
}) {
  const { clientId, websiteId, formId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id, name: websites.name })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.clientId, clientId)))
      .limit(1);
    if (!site) return null;

    const [form] = await tx
      .select({
        id: forms.id,
        formNumber: forms.formNumber,
        name: forms.name,
        fields: forms.fields,
        settings: forms.settings,
        submitLabel: forms.submitLabel,
      })
      .from(forms)
      .where(
        and(
          eq(forms.id, formId),
          eq(forms.clientId, clientId),
          eq(forms.websiteId, websiteId),
          isNull(forms.deletedAt),
        ),
      )
      .limit(1);

    if (!form) return null;
    return { site, form };
  });

  if (!data) notFound();

  const steps = data.form.settings?.steps?.length
    ? data.form.settings.steps
    : [{ id: DEFAULT_STEP_ID, title: "Step 1" }];
  const editHref = `/clients/${clientId}/websites/${websiteId}/forms/${formId}/edit`;
  const listHref = `/clients/${clientId}/websites/${websiteId}/forms`;

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-[-0.02em]">{data.form.name}</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Preview · {formShortcode(data.form.formNumber)}
          </p>
        </div>
        <Link
          href={editHref as never}
          className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
        >
          Edit form
        </Link>
        <Link
          href={listHref as never}
          className="rounded-lg border border-[#dbe1ea] px-3.5 py-2.5 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand"
        >
          Back
        </Link>
      </header>

      <div className="mx-auto max-w-xl rounded-2xl border border-line bg-white p-5 shadow-[0_12px_40px_rgba(11,30,58,.06)] sm:p-7">
        <FormPreviewClient
          name={data.form.name}
          fields={data.form.fields}
          steps={steps}
          submitLabel={data.form.submitLabel}
          appearance={mergeAppearance(data.form.settings?.appearance)}
          layout={data.form.settings?.layout}
          logic={data.form.settings?.logic}
        />
      </div>
    </div>
  );
}
