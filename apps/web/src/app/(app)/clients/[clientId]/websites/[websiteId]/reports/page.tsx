import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ReportView } from "@/components/reports/report-view";
import { SharePanel } from "@/components/reports/share-panel";
import { requireAgency } from "@/lib/auth/session";
import { loadReport, type ReportRange } from "@/lib/reports/service";
import { getShare } from "@/lib/reports/share";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/reports
 *
 * Spec §8: one page for leads, chat, analytics and activity — not four.
 */
export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { clientId, websiteId } = await params;
  const { range } = await searchParams;
  const ctx = await requireAgency();

  const days: ReportRange = range === "7" ? 7 : range === "90" ? 90 : 30;
  const [data, share] = await Promise.all([
    loadReport(ctx.agencyId, websiteId, days),
    getShare(ctx.agencyId, websiteId),
  ]);

  if (!data) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div>
      <PageHeader
        title="Reports & analytics"
        subtitle={`${data.website.name} · last ${days} days`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {([7, 30, 90] as ReportRange[]).map((d) => (
              <a
                key={d}
                href={`?range=${d}`}
                className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold ${
                  d === days
                    ? "border-brand bg-brand text-white"
                    : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                }`}
              >
                {d}d
              </a>
            ))}
            <a
              href={`/api/reports/${websiteId}/export?range=${days}`}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand"
            >
              CSV
            </a>
          </div>
        }
      />

      <SharePanel clientId={clientId} websiteId={websiteId} appUrl={appUrl} share={share} />

      {/* Never masked here — this is the agency's own data. */}
      <ReportView data={data} maskIps={false} />
    </div>
  );
}
