import type { ReportData } from "@/lib/reports/service";
import { maskIp } from "@/lib/reports/user-agent";
import { ScrollTable } from "@/components/ui/scroll-table";
import { SetupBadge } from "@/components/ui/setup-badge";
import { ActivityTable } from "./activity-table";

const TYPE_TONE: Record<string, string> = {
  pageview: "bg-[#f1f4f8] text-muted",
  button: "bg-[rgba(255,102,0,.1)] text-brand",
  consultation: "bg-[rgba(13,148,136,.1)] text-ok",
  form: "bg-[rgba(217,119,6,.12)] text-warn",
};

/**
 * The report itself, rendered identically for the agency and for a client
 * following a share link.
 *
 * One component for both is the point: a shared report that shows different
 * numbers from the dashboard is worse than not sharing at all. The only thing
 * the two do differently is whether visitor IPs are masked.
 */
export function ReportView({ data, maskIps }: { data: ReportData; maskIps: boolean }) {
  const t = data.totals;
  const peak = Math.max(1, ...data.daily.map((d) => d.n));

  const breakdown = [
    { label: "Button clicks", n: t.buttons, colour: "bg-brand" },
    { label: "Consultations", n: t.consultations, colour: "bg-ok" },
    { label: "Form events", n: t.formEvents, colour: "bg-navy" },
  ];
  const breakdownTotal = Math.max(1, breakdown.reduce((n, b) => n + b.n, 0));

  return (
    <>
      <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <ReportCard
          title="Leads report"
          detail={`${t.leads} ${t.leads === 1 ? "lead" : "leads"} captured from this site in the last ${data.range} days`}
        />
        <ReportCard
          title="Chat report"
          detail={`${t.chats} conversations · ${t.aiReplies} answered by the assistant · ${t.humanReplies} by a person`}
        />
        <ReportCard
          title="Website analytics"
          detail={
            t.pageviews > 0
              ? `${t.pageviews.toLocaleString()} page views · ${data.topPages.length} pages tracked`
              : "No page views yet — the tracking script has not reported in"
          }
          quiet={t.pageviews === 0}
          badge={t.pageviews === 0 ? "connect" : undefined}
        />
        <ReportCard
          title="Activity"
          detail={`${t.buttons + t.consultations + t.formEvents} tracked interactions across the site`}
          quiet={t.buttons + t.consultations + t.formEvents === 0}
          badge={
            t.buttons + t.consultations + t.formEvents === 0
              ? "connect"
              : undefined
          }
        />
      </div>

      <section className="mb-3.5 rounded-xl border border-line bg-white p-[18px]">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold">Activity report</h2>
          <span className="text-[12px] text-faint">
            every marked element, and which page it was clicked from
          </span>
        </div>

        <div className="mb-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            value={t.pageviews}
            label="Page views"
            badge={t.pageviews === 0 ? "connect" : undefined}
          />
          <Stat value={t.buttons} label="Button clicks" tone="text-brand" />
          <Stat value={t.formEvents} label="Form events" />
          <Stat value={t.leads} label="Leads" tone="text-ok" />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_.6fr]">
          <div className="rounded-[10px] border border-[#edf0f5] p-3.5">
            <p className="mb-2.5 text-[12.5px] font-semibold text-muted">
              Activity over time · last {data.range} days
            </p>
            {data.daily.length === 0 ? (
              <p className="py-8 text-center text-[12.5px] font-bold text-bad">
                <SetupBadge kind="connect" /> Nothing tracked yet
              </p>
            ) : (
              <div className="flex h-[110px] items-end gap-1.5">
                {data.daily.map((d) => (
                  <div
                    key={d.day}
                    title={`${d.day}: ${d.n}`}
                    style={{ height: `${Math.max(3, (d.n / peak) * 100)}%` }}
                    className={`min-h-[3px] flex-1 rounded-t ${
                      d.n === peak ? "bg-brand" : "bg-[#b9c7dd]"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center gap-3 rounded-[10px] border border-[#edf0f5] p-3.5">
            <p className="text-[12.5px] font-semibold text-muted">By type</p>
            {breakdown.map((b) => (
              <div key={b.label}>
                <div className="mb-1.5 flex items-center gap-2 text-[12.5px]">
                  <span className={`size-2 rounded-full ${b.colour}`} />
                  <span>{b.label}</span>
                  <span className="ml-auto font-bold">{b.n}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#edf0f5]">
                  <div
                    className={`h-full ${b.colour}`}
                    style={{ width: `${(b.n / breakdownTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <ActivityTable
          rows={data.activity.map((r) => ({
            id: r.id,
            eventType: r.eventType,
            label: r.elementLabel ?? (r.eventType === "pageview" ? "Page view" : "—"),
            cssClass: r.cssClass,
            purpose: r.purpose,
            pagePath: r.pagePath,
            where: [r.city, r.country].filter(Boolean).join(", ") || null,
            ip: maskIps ? maskIp(r.ipAddress) : (r.ipAddress ?? "—"),
            device: [r.device, r.browser].filter(Boolean).join(" · ") || null,
            at: r.createdAt.toISOString(),
          }))}
          tone={TYPE_TONE}
        />
      </section>

      <section className="rounded-xl border border-line bg-white p-[18px]">
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold">Website analytics</h2>
          <span className="text-[12px] text-faint">traffic and conversion — this website only</span>
        </div>

        <div className="mb-3.5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={t.pageviews} label="Page views" />
          <Stat value={t.leads} label="Leads" tone="text-ok" />
          <Stat
            value={data.conversionRate === null ? "—" : `${data.conversionRate.toFixed(1)}%`}
            label="Conversion rate"
          />
          <Stat value={t.chats} label="Chat conversations" />
        </div>

        {data.topPages.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-faint">
            No page views recorded. Top pages appear once the tracking script runs.
          </p>
        ) : (
          <ScrollTable minWidth={420} className="border-0">
            <div className="grid grid-cols-[1fr_.4fr] gap-2.5 border-b border-[#edf0f5] px-2.5 py-2 text-[10.5px] font-bold tracking-[0.07em] text-faint uppercase">
              <span>Page</span>
              <span>Views</span>
            </div>
            {data.topPages.map((p) => (
              <div
                key={p.pagePath}
                className="grid grid-cols-[1fr_.4fr] gap-2.5 border-b border-[#f1f4f8] px-2.5 py-2.5 text-[12.5px] last:border-0"
              >
                <span className="truncate font-medium">{p.pagePath}</span>
                <span>{p.views}</span>
              </div>
            ))}
          </ScrollTable>
        )}
      </section>
    </>
  );
}

function ReportCard({
  title,
  detail,
  quiet,
  badge,
}: {
  title: string;
  detail: string;
  quiet?: boolean;
  badge?: "connect" | "demo" | "setup" | "incomplete";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-[18px]">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[15px] font-bold">{title}</span>
        <span
          className={`ml-auto rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
            quiet ? "bg-[#f1f4f8]" : "bg-[rgba(13,148,136,.1)] text-ok"
          }`}
        >
          {badge ? <SetupBadge kind={badge} /> : quiet ? "No data" : "✓ Included"}
        </span>
      </div>
      <p className="text-[12.5px] leading-[1.5] text-muted">{detail}</p>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
  badge,
}: {
  value: number | string;
  label: string;
  tone?: string;
  badge?: "connect" | "demo" | "setup" | "incomplete";
}) {
  return (
    <div className="rounded-[10px] border border-[#edf0f5] bg-[#f8fafc] p-3.5">
      <div className={`text-[21px] font-bold tracking-[-0.02em] ${badge ? "text-bad" : tone ?? ""}`}>
        {badge ? (
          <SetupBadge kind={badge} size="lg" />
        ) : typeof value === "number" ? (
          value.toLocaleString()
        ) : (
          value
        )}
      </div>
      <div className="mt-0.5 text-[12px] text-muted">{label}</div>
    </div>
  );
}
