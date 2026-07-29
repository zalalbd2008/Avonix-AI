import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { SubmissionCrmPanel } from "@/components/forms/submission-crm-panel";
import { SubmissionAiBadge } from "@/components/forms/submission-ai-badge";
import { SubmissionScoresBadge } from "@/components/forms/submission-scores-badge";
import { FormAnalyticsPanel } from "@/components/forms/form-analytics-panel";
import { PageHeader } from "@/components/shell/page-header";
import { CopyBlock } from "@/components/ui/copy-block";
import { ScrollTable } from "@/components/ui/scroll-table";
import { timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { contacts, formSubmissions, forms, websites } from "@/lib/db/schema";
import { CONTACT_KEYS, embedSnippet } from "@/lib/forms/fields";
import { normalizeAdminCrm } from "@/lib/forms/admin-crm";
import { getFormAnalyticsSummary } from "@/lib/forms/analytics-service";
import { utmHasValues } from "@/lib/forms/analytics";

/** Route: /clients/[clientId]/forms/[formId] */
export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; formId: string }>;
}) {
  const { clientId, formId } = await params;
  const ctx = await requireAgency();

  const [form] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: forms.id,
        formNumber: forms.formNumber,
        name: forms.name,
        fields: forms.fields,
        settings: forms.settings,
        submitLabel: forms.submitLabel,
        successMessage: forms.successMessage,
        createdAt: forms.createdAt,
        websiteId: forms.websiteId,
        siteName: websites.name,
      })
      .from(forms)
      .leftJoin(websites, eq(websites.id, forms.websiteId))
      // clientId as well as formId: RLS keeps other agencies out, this keeps the
      // URL honest within your own agency.
      .where(and(eq(forms.id, formId), eq(forms.clientId, clientId)))
      .limit(1),
  );

  if (!form) notFound();

  const submissions = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: formSubmissions.id,
        values: formSubmissions.values,
        pageUrl: formSubmissions.pageUrl,
        createdAt: formSubmissions.createdAt,
        contactId: formSubmissions.contactId,
        contactName: contacts.name,
        contactEmail: contacts.email,
        crm: formSubmissions.crm,
        meta: formSubmissions.meta,
      })
      .from(formSubmissions)
      .leftJoin(contacts, eq(contacts.id, formSubmissions.contactId))
      .where(eq(formSubmissions.formId, formId))
      .orderBy(desc(formSubmissions.createdAt))
      .limit(100),
  );

  const analyticsSummary = await getFormAnalyticsSummary({
    agencyId: ctx.agencyId,
    formId,
    days: 30,
  });

  const snippet = embedSnippet(form);
  const editHref = form.websiteId
    ? `/clients/${clientId}/websites/${form.websiteId}/forms/${formId}/edit`
    : null;
  const admin = normalizeAdminCrm(form.settings?.admin);
  const crmEnabled = admin.enabled !== false;

  return (
    <>
      <PageHeader
        title={form.name}
        subtitle={`${form.fields.length} fields · ${form.settings?.steps?.length || 1} ${(form.settings?.steps?.length || 1) === 1 ? "step" : "steps"} · ${form.siteName ?? "any website"} · created ${timeAgo(form.createdAt)}`}
        action={
          editHref ? (
            <Link
              href={editHref as never}
              className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              Edit form
            </Link>
          ) : null
        }
      />

      <section className="mb-5 rounded-xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold">Paste this into the site</h2>
        <p className="mt-1 mb-3 text-[12.5px] text-muted">
          Multi-step navigation and conditional fields are included in this
          snippet. The Avonix plugin finds any form with a{" "}
          <code className="font-mono">data-form-id</code> and posts through
          WordPress, so your connector key never reaches the browser.
        </p>
        <CopyBlock value={snippet} />
      </section>

      <FormAnalyticsPanel summary={analyticsSummary} days={30} />

      <section className="mb-5">
        <h2 className="mb-3 text-sm font-semibold">Fields</h2>

        <div className="grid gap-3 md:hidden">
          {form.fields.map((f) => (
            <div
              key={f.key}
              className="rounded-xl border border-line bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13.5px] font-medium">{f.label}</p>
                <span className="shrink-0 text-[12.5px] text-muted">{f.type}</span>
              </div>
              <p className="mt-1 font-mono text-[12px] text-faint">{f.key}</p>
              <p className="mt-2 text-[12px] text-faint">
                {f.required && <span className="mr-2 text-warn">required</span>}
                {CONTACT_KEYS.has(f.key) ? "→ contact record" : "→ extra data"}
              </p>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <ScrollTable minWidth={640}>
            {form.fields.map((f) => (
              <div
                key={f.key}
                className="grid grid-cols-[1.4fr_.7fr_.7fr_1fr] items-center border-b border-[#f1f4f8] px-4 py-2.5 text-[13px] last:border-0"
              >
                <span className="font-medium">{f.label}</span>
                <span className="font-mono text-[12px] text-faint">{f.key}</span>
                <span className="text-[12.5px] text-muted">{f.type}</span>
                <span className="text-[12px] text-faint">
                  {f.required && <span className="mr-2 text-warn">required</span>}
                  {CONTACT_KEYS.has(f.key) ? "→ contact record" : "→ extra data"}
                </span>
              </div>
            ))}
          </ScrollTable>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          Submissions{submissions.length > 0 && ` (${submissions.length})`}
        </h2>

        {submissions.length === 0 ? (
          <p className="px-4 py-10 text-center text-[12.5px] text-muted">
            Nothing yet. Submissions appear here the moment the form is filled in
            on a site running the plugin.
          </p>
        ) : (
          submissions.map((s) => (
            <div key={s.id} className="border-b border-[#f1f4f8] px-4 py-3 last:border-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {s.contactId ? (
                  <Link
                    href={`/clients/${clientId}/contacts/${s.contactId}` as never}
                    className="text-[13.5px] font-semibold text-brand hover:underline"
                  >
                    {s.contactName ?? s.contactEmail ?? "Unnamed"}
                  </Link>
                ) : (
                  <span className="text-[13.5px] font-semibold">Unnamed</span>
                )}
                <span className="text-[12px] text-faint">{timeAgo(s.createdAt)}</span>
                {s.pageUrl && (
                  <span className="truncate text-[12px] text-faint">{s.pageUrl}</span>
                )}
              </div>

              {Object.keys(s.values).length > 0 && (
                <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px]">
                  {Object.entries(s.values).map(([k, v]) => (
                    <div key={k} className="flex gap-1.5">
                      <dt className="text-faint">{k}</dt>
                      <dd className="text-muted">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {utmHasValues(s.meta?.utm) ? (
                <p className="mt-1.5 text-[11.5px] text-faint">
                  UTM:{" "}
                  {[
                    s.meta?.utm?.source,
                    s.meta?.utm?.medium,
                    s.meta?.utm?.campaign,
                  ]
                    .filter(Boolean)
                    .join(" / ")}
                  {typeof s.meta?.durationMs === "number"
                    ? ` · ${(s.meta.durationMs / 1000).toFixed(0)}s`
                    : ""}
                </p>
              ) : null}

              <SubmissionAiBadge ai={s.meta?.ai} />
              <SubmissionScoresBadge
                scores={s.meta?.scores}
                portalUrl={
                  s.meta?.portalToken
                    ? `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/p/${s.meta.portalToken}`
                    : null
                }
              />

              {crmEnabled ? (
                <SubmissionCrmPanel
                  clientId={clientId}
                  formId={formId}
                  submissionId={s.id}
                  admin={admin}
                  crm={s.crm ?? {}}
                  compact
                />
              ) : null}
            </div>
          ))
        )}
      </section>
    </>
  );
}
