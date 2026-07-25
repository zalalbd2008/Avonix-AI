import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { LiquidFormBuilder } from "@/components/forms/liquid-form-builder";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { forms, websites } from "@/lib/db/schema";
import { DEFAULT_STEP_ID, mergeAppearance } from "@/lib/forms/fields";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/forms/[formId]/edit
 *
 * Edit an existing website-scoped form in the Ultimate builder.
 */
export default async function EditWebsiteFormPage({
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
        name: forms.name,
        fields: forms.fields,
        settings: forms.settings,
        submitLabel: forms.submitLabel,
        successMessage: forms.successMessage,
        websiteId: forms.websiteId,
      })
      .from(forms)
      .where(
        and(
          eq(forms.id, formId),
          eq(forms.clientId, clientId),
          eq(forms.websiteId, websiteId),
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

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-[-0.02em]">Edit form</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Save changes anytime — fields, steps, logic, and appearance for{" "}
          {data.site.name}
        </p>
      </header>

      <LiquidFormBuilder
        clientId={clientId}
        websiteId={websiteId}
        websiteName={data.site.name}
        memberRole={ctx.role}
        initial={{
          formId: data.form.id,
          name: data.form.name,
          submitLabel: data.form.submitLabel,
          successMessage: data.form.successMessage,
          fields: data.form.fields,
          steps,
          appearance: mergeAppearance(data.form.settings?.appearance),
          notificationEmail: data.form.settings?.notificationEmail ?? "",
          confirmation: data.form.settings?.confirmation,
          submissionUx: data.form.settings?.submissionUx,
          ux: data.form.settings?.ux,
          trust: data.form.settings?.trust,
          admin: data.form.settings?.admin,
          analytics: data.form.settings?.analytics,
          security: data.form.settings?.security,
          integrations: data.form.settings?.integrations,
          ai: data.form.settings?.ai,
          enterprise: data.form.settings?.enterprise,
          layout: data.form.settings?.layout,
          rows: data.form.settings?.rows,
          logic: data.form.settings?.logic,
        }}
      />
    </div>
  );
}
