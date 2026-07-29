"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ScrollTable } from "@/components/ui/scroll-table";
import {
  actionClearAuditLog,
  actionSaveAuditLog,
} from "@/lib/audit-log/actions";
import {
  AUDIT_KINDS,
  RETENTION_OPTIONS,
  auditLogConfigScore,
  entriesToCsv,
  formatTime,
  kindLabel,
  mergeAuditLogSettings,
  timeAgo,
  toneClasses,
  toneLabel,
  type AuditEventKind,
  type AuditLogEntry,
  type AuditLogSettings,
  type AuditLogSnapshot,
} from "@/lib/audit-log/types";

type FilterTab = "all" | AuditEventKind;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  ...AUDIT_KINDS.map((k) => ({ id: k.id as FilterTab, label: k.label })),
];

export function AuditLogStudio({
  clientId,
  websiteId,
  websiteName,
  snapshot,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  snapshot: AuditLogSnapshot;
  initial?: Partial<AuditLogSettings> | null;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(() =>
    mergeAuditLogSettings(initial),
  );

  useEffect(() => {
    setSettings(mergeAuditLogSettings(initial));
  }, [initial]);
  const [tab, setTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/clients/${clientId}/websites/${websiteId}`;
  const reportsHref = `${base}/reports`;
  const errorLogHref = `${base}/error-log`;

  const score = useMemo(() => auditLogConfigScore(settings), [settings]);

  const entries = useMemo(
    () =>
      [...settings.entries].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [settings.entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (tab !== "all" && e.kind !== tab) return false;
      if (!q) return true;
      return (
        e.actor.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q) ||
        e.meta.toLowerCase().includes(q)
      );
    });
  }, [entries, tab, query]);

  function patch(partial: Partial<AuditLogSettings>) {
    setSettings((s) => mergeAuditLogSettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveAuditLog({
        websiteId,
        clientId,
        settings,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    });
  }

  function clearLog() {
    if (!entries.length) return;
    if (!window.confirm("Clear all audit log entries for this website?")) return;
    startTransition(async () => {
      const res = await actionClearAuditLog({
        websiteId,
        clientId,
        settings,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSettings((s) => mergeAuditLogSettings({ ...s, entries: [] }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  function exportCsv() {
    if (!entries.length) return;
    const blob = new Blob([entriesToCsv(entries)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${websiteId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle={`Every action on this website, logged · ${websiteName}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <span className="text-[12px] font-semibold text-ok">Saved</span>
            ) : null}
            {error ? (
              <span className="max-w-[240px] text-[12px] font-medium text-bad">
                {error}
              </span>
            ) : null}
            <button
              type="button"
              disabled={entries.length === 0}
              onClick={exportCsv}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand disabled:opacity-50"
            >
              Export log
            </button>
            <button
              type="button"
              disabled={pending || entries.length === 0}
              onClick={clearLog}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand disabled:opacity-50"
            >
              Clear log
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save settings"}
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          value={String(snapshot.stats.events30d)}
          label="Events · 30 days"
          tone={snapshot.stats.events30d > 0 ? "text-ink" : "text-muted"}
        />
        <Metric value={String(snapshot.stats.users)} label="Users" />
        <Metric
          value={String(snapshot.stats.suspicious)}
          label="Suspicious"
          tone={
            snapshot.stats.suspicious > 0 ? "text-warn" : "text-ok"
          }
        />
        <Metric
          value={snapshot.stats.retentionLabel}
          label="Retention"
        />
      </div>

      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          snapshot.loggingReady
            ? "border-ok/25 bg-ok/5"
            : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            snapshot.loggingReady ? "bg-ok" : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          {snapshot.loggingReady ? (
            <p>
              <b className="font-semibold text-ink">Audit trail active.</b>{" "}
              <span className="text-muted">
                Agency changes and connector system events append here.
                Visitor activity still lives in{" "}
                <Link
                  href={reportsHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Reports
                </Link>
                . Runtime faults go to{" "}
                <Link
                  href={errorLogHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Error Log
                </Link>
                .
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">Waiting for events.</b>{" "}
              <span className="text-muted">
                Enable tracking below — the first entry appears when someone
                saves settings or the connector reports an action.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Section title="Activity" subtitle="Newest events first">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3 border-b border-[#edf0f5] pb-2 sm:border-0 sm:pb-0">
              {FILTER_TABS.map((t) => {
                const count =
                  t.id === "all"
                    ? entries.length
                    : entries.filter((e) => e.kind === t.id).length;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`cursor-pointer border-b-2 px-0.5 pb-1.5 text-[13px] font-medium transition ${
                      tab === t.id
                        ? "border-brand text-brand"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {t.label}
                    <span className="ml-1 text-[11px] text-faint">· {count}</span>
                  </button>
                );
              })}
            </div>
            <input
              className="w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand sm:max-w-[220px]"
              placeholder="Search audit log…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-faint">
              {entries.length === 0
                ? "No audit events yet — save settings once to record the first entry."
                : "No matches in this filter."}
            </p>
          ) : (
            <ScrollTable minWidth={680}>
              <div className="grid grid-cols-[1fr_1.2fr_1fr_auto_auto] gap-3 border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                <span>Who</span>
                <span>What</span>
                <span>Context</span>
                <span>When</span>
                <span>Status</span>
              </div>
              {filtered.map((row) => (
                <AuditRow key={row.id} row={row} />
              ))}
            </ScrollTable>
          )}
        </Section>

        <aside className="space-y-4">
          <Section title="Tracking" subtitle="What gets recorded">
            <Toggle
              label="Enable audit log"
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
            />
            <Toggle
              label="User sign-ins"
              checked={settings.trackLogin}
              onChange={(trackLogin) => patch({ trackLogin })}
            />
            <Toggle
              label="Settings changes"
              checked={settings.trackSettings}
              onChange={(trackSettings) => patch({ trackSettings })}
            />
            <Toggle
              label="Content / popups / forms"
              checked={settings.trackContent}
              onChange={(trackContent) => patch({ trackContent })}
            />
            <Toggle
              label="System / connector"
              checked={settings.trackSystem}
              onChange={(trackSystem) => patch({ trackSystem })}
            />
            <Toggle
              label="Security events"
              checked={settings.trackSecurity}
              onChange={(trackSecurity) => patch({ trackSecurity })}
            />
            <Field label="Retention">
              <div className="flex flex-wrap gap-2">
                {RETENTION_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => patch({ retentionDays: days })}
                    className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${
                      settings.retentionDays === days
                        ? "border-brand bg-brand text-white"
                        : "border-line text-muted hover:border-brand hover:text-brand"
                    }`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Readiness
            </h2>
            <div className="space-y-2 px-4 py-4">
              <Metric
                value={`${score}%`}
                label="Config score"
                tone={
                  score >= 70
                    ? "text-ok"
                    : score >= 40
                      ? "text-warn"
                      : "text-muted"
                }
              />
              <p className="text-[12px] text-muted">
                Saving settings on this page appends a real audit row with your
                agency user name.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AuditRow({ row }: { row: AuditLogEntry }) {
  const tone = toneClasses(row.tone);
  return (
    <div className="grid grid-cols-[1fr_1.2fr_1fr_auto_auto] items-start gap-3 border-b border-[#edf0f5] px-4 py-3 last:border-b-0">
      <div>
        <p className="text-[13.5px] font-semibold text-ink">{row.actor}</p>
        <p className="text-[11px] text-faint">{kindLabel(row.kind)}</p>
      </div>
      <div>
        <p className="text-[13px] font-medium text-ink">{row.action}</p>
        <p className="text-[12px] text-muted">{row.detail}</p>
      </div>
      <span className="text-[12px] text-muted">{row.meta || "—"}</span>
      <span className="whitespace-nowrap text-[12px] text-muted">
        {formatTime(row.createdAt)}
        <span className="mt-0.5 block text-[11px] text-faint">
          {timeAgo(row.createdAt)}
        </span>
      </span>
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.bg} ${tone.text}`}
      >
        {row.suspicious ? "Suspicious" : toneLabel(row.tone)}
      </span>
    </div>
  );
}

function Metric({
  value,
  label,
  tone = "text-ink",
}: {
  value: string;
  label: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-white px-4 pb-3.5 pt-4">
      <div
        className={`truncate text-2xl font-bold tracking-[-0.02em] ${tone}`}
        title={value}
      >
        {value}
      </div>
      <div className="mt-[3px] text-[12.5px] text-muted">{label}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="border-b border-[#edf0f5] px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-ink">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-[13px] font-semibold text-ink">{label}</span>
    </label>
  );
}
