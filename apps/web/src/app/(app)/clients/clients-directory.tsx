"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type ClientListItem = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  siteCount: number;
  connectedCount: number;
  contactCount: number;
  createdAt: string;
};

const AVATAR_TONES = [
  "bg-[#0b1e3a] text-white",
  "bg-brand text-white",
  "bg-[#0f766e] text-white",
  "bg-[#1e3a5f] text-white",
  "bg-[#b45309] text-white",
  "bg-[#334155] text-white",
] as const;

function avatarTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * (i + 1)) % 97;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function formatJoined(iso: string) {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Searchable client directory — card grid with workspace stats.
 */
export function ClientsDirectory({
  clients,
  atLimit,
  planLabel,
  maxClients,
}: {
  clients: ClientListItem[];
  atLimit: boolean;
  planLabel: string;
  maxClients: number;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "empty">("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter === "live" && c.connectedCount < 1) return false;
      if (filter === "empty" && c.siteCount > 0) return false;
      if (!needle) return true;
      return [c.name, c.contactEmail ?? "", c.contactPhone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [clients, q, filter]);

  const totals = useMemo(() => {
    const sites = clients.reduce((n, c) => n + c.siteCount, 0);
    const live = clients.reduce((n, c) => n + c.connectedCount, 0);
    const contacts = clients.reduce((n, c) => n + c.contactCount, 0);
    return { sites, live, contacts };
  }, [clients]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric value={clients.length} label="Clients" hint={`${planLabel} plan`} />
        <Metric value={totals.sites} label="Websites" />
        <Metric value={totals.live} label="Connected" tone="text-ok" />
        <Metric value={totals.contacts} label="Contacts" />
      </div>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["live", "Connected sites"],
              ["empty", "No websites"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                filter === id
                  ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                  : "border-line bg-white text-muted hover:border-[#c3ccd9] hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 sm:ml-auto sm:max-w-xs">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients…"
            className="w-full rounded-lg border border-line bg-white py-2 pr-3 pl-9 text-[13px] outline-none placeholder:text-faint focus:border-brand"
          />
          <svg
            className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M10.5 10.5L14 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {atLimit ? (
        <p className="mb-4 rounded-lg border border-[rgba(255,102,0,.25)] bg-[#fff8f3] px-3.5 py-2.5 text-[12.5px] text-brand">
          You are at the {planLabel} limit ({maxClients} clients).{" "}
          <Link href="/billing" className="font-semibold underline">
            Upgrade
          </Link>{" "}
          to add more.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#dbe1ea] bg-[#f8fafc] px-6 py-14 text-center">
          <p className="text-[14px] font-semibold text-ink">No matching clients</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            Try another search or clear the filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setFilter("all");
            }}
            className="mt-4 text-[13px] font-semibold text-brand hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  value,
  label,
  hint,
  tone,
}: {
  value: number;
  label: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 pt-4 pb-3.5">
      <div className={`text-2xl font-bold tracking-[-0.02em] ${tone ?? "text-ink"}`}>
        {value}
      </div>
      <div className="mt-[3px] text-[12.5px] text-muted">{label}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-faint">{hint}</div> : null}
    </div>
  );
}

function ClientCard({ client: c }: { client: ClientListItem }) {
  const joined = formatJoined(c.createdAt);
  return (
    <article className="group flex min-h-[200px] flex-col overflow-hidden rounded-xl border border-line bg-white transition-[border-color,box-shadow] hover:border-[#c3ccd9] hover:shadow-[0_8px_24px_rgba(11,30,58,.06)]">
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-[12px] text-[16px] font-bold ${avatarTone(c.name)}`}
          >
            {c.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold tracking-[-0.01em] text-ink">
              {c.name}
            </h2>
            <p className="mt-0.5 truncate text-[12.5px] text-muted">
              {c.contactEmail || c.contactPhone || "No contact on file"}
            </p>
          </div>
          {c.connectedCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[rgba(13,148,136,.1)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-ok uppercase">
              Live
            </span>
          ) : c.siteCount === 0 ? (
            <span className="shrink-0 rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-muted uppercase">
              Setup
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-[rgba(217,119,6,.1)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-warn uppercase">
              Pending
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          <Stat value={c.siteCount} label="Sites" />
          <Stat value={c.connectedCount} label="Live" accent={c.connectedCount > 0} />
          <Stat value={c.contactCount} label="Leads" />
        </div>

        {joined ? (
          <p className="mt-3 text-[11.5px] text-faint">Added {joined}</p>
        ) : (
          <div className="mt-3" />
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-[#edf0f5] bg-[#fafbfc] px-4 py-3">
        <Link
          href={`/clients/${c.id}/websites/new` as never}
          className="text-[12.5px] font-semibold text-muted hover:text-ink"
        >
          + Website
        </Link>
        <Link
          href={`/clients/${c.id}` as never}
          className="ml-auto inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Open workspace
          <span aria-hidden className="opacity-80 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </article>
  );
}

function Stat({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-2.5 py-2 ${
        accent ? "bg-[rgba(13,148,136,.08)]" : "bg-[#f8fafc]"
      }`}
    >
      <div
        className={`text-[15px] font-bold tracking-[-0.02em] ${
          accent ? "text-ok" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className={`text-[10.5px] font-medium ${accent ? "text-ok/80" : "text-muted"}`}>
        {label}
      </div>
    </div>
  );
}
