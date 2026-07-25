import { notFound } from "next/navigation";
import { ReportView } from "@/components/reports/report-view";
import { loadReport } from "@/lib/reports/service";
import { resolveShare } from "@/lib/reports/share";

/**
 * Route: /r/[slug] — public, no login, read only.
 *
 * The slug is the only credential, so an unknown *or disabled* one gets a plain
 * 404. Distinguishing the two would tell a stranger which slugs exist.
 *
 * `force-dynamic` because the whole promise of the link is live numbers; a
 * cached copy would quietly go stale and the client would never know.
 */
export const dynamic = "force-dynamic";

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const share = await resolveShare(slug);
  if (!share) notFound();

  const data = await loadReport(share.agencyId, share.websiteId, 30);
  if (!data) notFound();

  const brand = share.branding;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white px-6 py-4">
        <div className="mx-auto flex max-w-[1060px] items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-navy text-[15px] font-bold text-white">
            {(brand.footerCredit || data.website.name).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-bold tracking-[-0.02em]">
              {data.website.name} — report
            </h1>
            <p className="truncate text-[12.5px] text-muted">
              Live figures for the last {data.range} days
            </p>
          </div>
          <span className="ml-auto hidden shrink-0 rounded-full bg-[rgba(13,148,136,.1)] px-2.5 py-[3px] text-[11.5px] font-semibold text-ok sm:inline">
            Read only
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1060px] px-6 py-6">
        <ReportView data={data} maskIps={share.maskIps} />
      </main>

      <footer className="border-t border-line px-6 py-6 text-center text-[12.5px] text-faint">
        {brand.footerCredit && <p className="font-semibold text-muted">{brand.footerCredit}</p>}
        {(brand.phone || brand.email) && (
          <p className="mt-1">{[brand.phone, brand.email].filter(Boolean).join(" · ")}</p>
        )}
        <p className="mt-2">Generated {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
}
