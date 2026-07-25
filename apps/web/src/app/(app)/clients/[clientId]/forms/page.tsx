import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { formSubmissions, forms, websites } from "@/lib/db/schema";

/** Route: /clients/[clientId]/forms */
export default async function FormsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  // leftJoin + groupBy rather than a correlated subquery: Drizzle's `sql`
  // subqueries do not correlate against the outer row here, and the failure is
  // silent — every count comes back zero with no error.
  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: forms.id,
        name: forms.name,
        fields: forms.fields,
        createdAt: forms.createdAt,
        siteName: websites.name,
        submissions: count(formSubmissions.id),
      })
      .from(forms)
      .leftJoin(websites, eq(websites.id, forms.websiteId))
      .leftJoin(formSubmissions, eq(formSubmissions.formId, forms.id))
      .where(eq(forms.clientId, clientId))
      .groupBy(forms.id, websites.name)
      .orderBy(desc(forms.createdAt)),
  );

  return (
    <div>
      <header className="mb-[18px] flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em]">Forms</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {rows.length} {rows.length === 1 ? "form" : "forms"} for this client
          </p>
        </div>
        <Link
          href={`/clients/${clientId}/forms/new` as never}
          className="ml-auto shrink-0 rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
        >
          + New form
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No forms yet</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted">
            A form gives you markup to paste into the client&apos;s site. Anyone
            who fills it in becomes a contact and lands in the inbox.
          </p>
          <Link
            href={`/clients/${clientId}/forms/new` as never}
            className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline"
          >
            Build the first one →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {rows.map((f) => (
            <Link
              key={f.id}
              href={`/clients/${clientId}/forms/${f.id}` as never}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#f8fafc]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{f.name}</div>
                <div className="mt-px text-[12.5px] text-muted">
                  {f.fields.length} {f.fields.length === 1 ? "field" : "fields"} ·{" "}
                  {f.submissions} {f.submissions === 1 ? "submission" : "submissions"} ·{" "}
                  {f.siteName ?? "any website"}
                </div>
              </div>
              <span
                className={`ml-auto shrink-0 rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${
                  f.submissions > 0
                    ? "bg-[rgba(13,148,136,.1)] text-ok"
                    : "bg-[#f1f4f8] text-muted"
                }`}
              >
                {f.submissions > 0 ? "Collecting" : "No submissions"}
              </span>
              <span className="shrink-0 text-[#c3ccd9]">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
