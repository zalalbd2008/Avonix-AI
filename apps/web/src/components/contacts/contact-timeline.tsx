"use client";

import { timeAgo } from "@/components/ui/status-pill";

export type TimelineItem = {
  id: string;
  eventType: string;
  title: string;
  detail: string | null;
  createdAt: Date | string;
};

const TONE: Record<string, string> = {
  form_submit: "bg-sky-100 text-sky-800",
  new_lead: "bg-emerald-100 text-emerald-800",
  email_sent: "bg-teal-100 text-teal-800",
  email_opened: "bg-yellow-100 text-yellow-900",
  email_clicked: "bg-orange-100 text-orange-900",
  follow_up_scheduled: "bg-amber-100 text-amber-900",
  follow_up_sent: "bg-orange-100 text-orange-900",
  chat_handoff: "bg-violet-100 text-violet-800",
  chat_missed: "bg-rose-100 text-rose-800",
  uptime_down: "bg-red-100 text-red-800",
  sms_sent: "bg-indigo-100 text-indigo-800",
  assign: "bg-red-100 text-red-800",
  score: "bg-lime-100 text-lime-900",
  crm_save: "bg-slate-100 text-slate-800",
  tag: "bg-fuchsia-100 text-fuchsia-800",
};

export function ContactTimeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return (
      <p className="px-4 py-8 text-center text-[12.5px] text-muted">
        No journey events yet. Form submits and Auto Rules will appear here.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0 px-4 py-2">
      {items.map((item, i) => {
        const tone = TONE[item.eventType] ?? "bg-[#eef2f7] text-ink";
        const at =
          item.createdAt instanceof Date
            ? item.createdAt
            : new Date(item.createdAt);
        return (
          <li
            key={item.id}
            className="relative flex gap-3 border-b border-[#f1f4f8] py-3 last:border-0"
          >
            <span
              className={`mt-0.5 size-2.5 shrink-0 rounded-full ${
                i === 0 ? "bg-brand" : "bg-[#c9d2de]"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}
                >
                  {item.eventType.replace(/_/g, " ")}
                </span>
                <span className="text-[11px] text-faint">{timeAgo(at)}</span>
              </div>
              <p className="mt-1 text-[13px] font-semibold text-ink">
                {item.title}
              </p>
              {item.detail ? (
                <p className="mt-0.5 line-clamp-3 text-[12px] text-muted">
                  {item.detail}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
