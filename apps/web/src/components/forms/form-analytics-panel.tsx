import {
  formatDuration,
  type FormAnalyticsSummary,
} from "@/lib/forms/analytics";

/**
 * Form funnel + UTM summary on the form detail / leads page.
 */
export function FormAnalyticsPanel({
  summary,
  days = 30,
}: {
  summary: FormAnalyticsSummary;
  days?: number;
}) {
  const peak = Math.max(
    1,
    ...summary.daily.map((d) => Math.max(d.views, d.starts, d.completes)),
  );

  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
      <div className="border-b border-[#edf0f5] px-4 py-3">
        <h2 className="text-sm font-semibold">Analytics</h2>
        <p className="mt-0.5 text-[12px] text-faint">
          Last {days} days · views, starts, completion, drop-off, UTM
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <Stat label="Views" value={summary.views} />
        <Stat label="Starts" value={summary.starts} />
        <Stat
          label="Completion"
          value={`${Math.round(summary.completionRate * 100)}%`}
          hint={`${summary.completes} completed`}
          tone="text-ok"
        />
        <Stat
          label="Abandonment"
          value={`${Math.round(summary.abandonmentRate * 100)}%`}
          hint={`Avg time ${formatDuration(summary.avgCompletionMs)}`}
        />
      </div>

      <div className="grid gap-3 border-t border-[#edf0f5] p-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#edf0f5] p-3">
          <p className="mb-2 text-[12px] font-semibold text-muted">
            Funnel over time
          </p>
          {summary.daily.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-faint">
              No events yet — publish the embed on a site with the connector.
            </p>
          ) : (
            <div className="flex h-[100px] items-end gap-1">
              {summary.daily.map((d) => (
                <div
                  key={d.day}
                  className="flex min-w-0 flex-1 flex-col justify-end gap-0.5"
                  title={`${d.day}: ${d.views} views · ${d.starts} starts · ${d.completes} completes`}
                >
                  <div
                    className="w-full rounded-t bg-[#c5d0e0]"
                    style={{
                      height: `${Math.max(2, (d.views / peak) * 100)}%`,
                    }}
                  />
                  <div
                    className="w-full bg-brand/50"
                    style={{
                      height: `${Math.max(0, (d.starts / peak) * 100)}%`,
                    }}
                  />
                  <div
                    className="w-full rounded-b bg-brand"
                    style={{
                      height: `${Math.max(0, (d.completes / peak) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10.5px] text-faint">
            Grey = views · light = starts · orange = completes
          </p>
        </div>

        <div className="rounded-lg border border-[#edf0f5] p-3">
          <p className="mb-2 text-[12px] font-semibold text-muted">
            UTM / sources
          </p>
          {summary.utmSources.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-faint">
              No UTM parameters captured yet
            </p>
          ) : (
            <ul className="max-h-[140px] overflow-auto">
              {summary.utmSources.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between gap-2 border-b border-[#f1f4f8] py-1.5 text-[12.5px] last:border-0"
                >
                  <span className="min-w-0 truncate font-medium">{s.label}</span>
                  <span className="shrink-0 tabular-nums text-muted">{s.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {summary.fieldDropoff.length > 0 ? (
        <div className="border-t border-[#edf0f5] px-4 py-3">
          <p className="mb-2 text-[12px] font-semibold text-muted">
            Field focus (drop-off signals)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.fieldDropoff.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f4f8] px-2.5 py-1 text-[11.5px] font-semibold text-muted"
              >
                <span className="font-mono">{f.key}</span>
                <span className="text-faint">{f.focuses}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-[#edf0f5] bg-[#fbfcfe] px-3 py-2.5">
      <p className="text-[10.5px] font-semibold tracking-wide text-faint uppercase">
        {label}
      </p>
      <p className={`mt-0.5 text-[20px] font-bold tracking-[-0.02em] ${tone ?? ""}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}
