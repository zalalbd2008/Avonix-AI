"use client";

import { useMemo, useState } from "react";

export type ActivityTableRow = {
  id: string;
  eventType: string;
  label: string;
  cssClass: string | null;
  purpose: string | null;
  pagePath: string;
  where: string | null;
  ip: string;
  device: string | null;
  at: string;
};

const TABS: { key: string; label: string; types: string[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "button", label: "Buttons", types: ["button"] },
  { key: "consultation", label: "Consultations", types: ["consultation"] },
  { key: "form", label: "Forms", types: ["form"] },
  { key: "pageview", label: "Page views", types: ["pageview"] },
];

/**
 * The filterable activity log (spec §8.3).
 *
 * Filtering and searching happen in the browser over the rows already sent —
 * the query caps at 200, so there is nothing more on the server to fetch. When
 * that cap starts to bite the fix is paging, not a round trip per keystroke,
 * and the footer says so rather than pretending the list is complete.
 */
export function ActivityTable({
  rows,
  tone,
}: {
  rows: ActivityTableRow[];
  tone: Record<string, string>;
}) {
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const types = TABS.find((t) => t.key === tab)?.types ?? [];
    const term = query.trim().toLowerCase();

    return rows.filter((r) => {
      if (types.length > 0 && !types.includes(r.eventType)) return false;
      if (!term) return true;
      return [r.label, r.cssClass, r.pagePath, r.purpose, r.ip, r.where]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [rows, tab, query]);

  const countFor = (key: string) => {
    const types = TABS.find((t) => t.key === key)?.types ?? [];
    return types.length === 0 ? rows.length : rows.filter((r) => types.includes(r.eventType)).length;
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-[18px] border-b border-[#edf0f5]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`cursor-pointer border-b-2 px-0.5 py-1.5 text-[13px] ${
              tab === t.key
                ? "border-brand font-bold text-brand"
                : "border-transparent font-medium text-muted hover:text-ink"
            }`}
          >
            {t.label} · {countFor(t.key)}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by label, class, page, purpose or address…"
        className="mb-3 w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-[13px] outline-none focus:border-brand"
      />

      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[1.4fr_.9fr_1.2fr_.9fr_.8fr] gap-2.5 border-b border-[#edf0f5] px-2.5 py-2 text-[10.5px] font-bold tracking-[0.07em] text-faint uppercase">
            <span>Action</span>
            <span>Page</span>
            <span>Purpose</span>
            <span>Visitor</span>
            <span>When</span>
          </div>

          {shown.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[1.4fr_.9fr_1.2fr_.9fr_.8fr] items-center gap-2.5 border-b border-[#f1f4f8] px-2.5 py-2.5 text-[12.5px] last:border-0"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded-full px-2 py-px text-[10px] font-bold uppercase ${
                      tone[r.eventType] ?? "bg-[#f1f4f8] text-muted"
                    }`}
                  >
                    {r.eventType}
                  </span>
                  <span className="truncate text-[13px] font-semibold">{r.label}</span>
                </span>
                {r.cssClass && (
                  <span className="mt-px block truncate font-mono text-[11px] text-brand">
                    .{r.cssClass}
                  </span>
                )}
              </span>
              <span className="truncate text-[#3c4c66]">{r.pagePath}</span>
              <span className="truncate text-muted">{r.purpose ?? "—"}</span>
              <span className="min-w-0">
                <span className="block truncate font-mono text-[11.5px] text-[#3c4c66]">
                  {r.ip}
                </span>
                <span className="block truncate text-[11px] text-faint">
                  {[r.where, r.device].filter(Boolean).join(" · ") || "—"}
                </span>
              </span>
              <span className="text-[12px] text-faint">
                {new Date(r.at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}

          {shown.length === 0 && (
            <p className="py-5 text-center text-[13px] text-faint">
              {rows.length === 0
                ? "Nothing tracked yet. Add a marker class to a button on the site."
                : "No activity matches this filter"}
            </p>
          )}
        </div>
      </div>

      {rows.length >= 200 && (
        <p className="mt-2 text-[11.5px] text-faint">
          Showing the most recent 200 events. Export as CSV for the full range.
        </p>
      )}
    </>
  );
}
