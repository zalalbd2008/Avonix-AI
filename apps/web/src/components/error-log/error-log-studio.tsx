"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import { ScrollTable } from "@/components/ui/scroll-table";
import {
  actionClearErrorLog,
  actionSaveErrorLog,
} from "@/lib/error-log/actions";
import {
  ERROR_KINDS,
  RETENTION_OPTIONS,
  errorLogConfigScore,
  kindLabel,
  kindTone,
  mergeErrorLogSettings,
  timeAgo,
  type ErrorKind,
  type ErrorLogEntry,
  type ErrorLogSettings,
  type ErrorLogSnapshot,
} from "@/lib/error-log/types";

type FilterTab = "all" | ErrorKind;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  ...ERROR_KINDS.map((k) => ({ id: k.id as FilterTab, label: k.label })),
];

export function ErrorLogStudio({
  clientId,
  websiteId,
  websiteName,
  snapshot,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  snapshot: ErrorLogSnapshot;
  initial?: Partial<ErrorLogSettings> | null;
}) {
  const [settings, setSettings] = useState(() =>
    mergeErrorLogSettings(initial),
  );
  const [tab, setTab] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/clients/${clientId}/websites/${websiteId}`;
  const emailHref = `${base}/email`;
  const securityHref = `${base}/security`;
  const automationHref = `${base}/automation`;

  const score = useMemo(() => errorLogConfigScore(settings), [settings]);

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
        e.title.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
      );
    });
  }, [entries, tab, query]);

  function patch(partial: Partial<ErrorLogSettings>) {
    setSettings((s) => mergeErrorLogSettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveErrorLog({
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
    });
  }

  function clearLog() {
    if (!entries.length) return;
    if (!window.confirm("Clear all error log entries for this website?")) return;
    startTransition(async () => {
      const res = await actionClearErrorLog({
        websiteId,
        clientId,
        settings,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSettings((s) => mergeErrorLogSettings({ ...s, entries: [] }));
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  return (
    <div>
      <PageHeader
        title="Error Log"
        subtitle={`PHP, database and API errors · ${websiteName}`}
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
          value={String(snapshot.stats.fatal)}
          label="Fatal errors"
          tone={snapshot.stats.fatal > 0 ? "text-bad" : "text-ok"}
          badge={
            !settings.enabled
              ? "setup"
              : !snapshot.collectorReady
                ? "connect"
                : undefined
          }
        />
        <Metric
          value={String(snapshot.stats.warning)}
          label="Warnings"
          tone={snapshot.stats.warning > 0 ? "text-warn" : "text-ink"}
        />
        <Metric value={String(snapshot.stats.notice)} label="Notices" />
        <Metric
          value={String(snapshot.stats.db)}
          label="DB errors"
          tone={snapshot.stats.db > 0 ? "text-bad" : "text-ink"}
        />
      </div>

      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          snapshot.collectorReady
            ? "border-ok/25 bg-ok/5"
            : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            snapshot.collectorReady ? "bg-ok" : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          {snapshot.collectorReady ? (
            <p>
              <b className="font-semibold text-ink">Collector active.</b>{" "}
              <span className="text-muted">
                The connector forwards runtime errors here. Fatal events can
                alert via{" "}
                <Link
                  href={emailHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  SMTP Setup
                </Link>
                . Retention: {settings.retentionDays} days.
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">Waiting for errors.</b>{" "}
              <span className="text-muted">
                Connect the plugin and enable collectors below. Nothing is
                logged until the site reports a real error — Avonix does not
                fabricate log lines.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Section title="Recent errors" subtitle="Newest first">
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
              placeholder="Search errors…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-faint">
              {entries.length === 0
                ? "No errors recorded yet — a clean log is a good sign."
                : "No matches in this filter."}
            </p>
          ) : (
            <ScrollTable minWidth={640}>
              <div className="grid grid-cols-[1fr_1.4fr_auto_auto] gap-3 border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                <span>Error</span>
                <span>Detail</span>
                <span>When</span>
                <span>Type</span>
              </div>
              {filtered.map((row) => (
                <ErrorRow key={row.id} row={row} />
              ))}
            </ScrollTable>
          )}
        </Section>

        <aside className="space-y-4">
          <Section title="Collectors" subtitle="What the connector forwards">
            <Toggle
              label="Enable error log"
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
            />
            <Toggle
              label="PHP errors"
              checked={settings.collectPhp}
              onChange={(collectPhp) => patch({ collectPhp })}
            />
            <Toggle
              label="JavaScript errors"
              checked={settings.collectJs}
              onChange={(collectJs) => patch({ collectJs })}
            />
            <Toggle
              label="Database errors"
              checked={settings.collectDb}
              onChange={(collectDb) => patch({ collectDb })}
            />
            <Toggle
              label="API / REST errors"
              checked={settings.collectApi}
              onChange={(collectApi) => patch({ collectApi })}
            />
            <Toggle
              label="SMTP / mail errors"
              checked={settings.collectSmtp}
              onChange={(collectSmtp) => patch({ collectSmtp })}
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
            <Toggle
              label="Email on fatal error"
              checked={settings.notifyOnFatal}
              onChange={(notifyOnFatal) => patch({ notifyOnFatal })}
            />
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
                badge={score < 40 ? "setup" : undefined}
              />
              <p className="text-[12px] text-muted">
                Pair with{" "}
                <Link
                  href={securityHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Security
                </Link>{" "}
                scans and{" "}
                <Link
                  href={automationHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Auto rules
                </Link>{" "}
                for SMTP-failure retries.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ErrorRow({ row }: { row: ErrorLogEntry }) {
  const tone = kindTone(row.kind);
  const detail = row.source
    ? `${row.message} · ${row.source}`
    : row.message;

  return (
    <div className="grid grid-cols-[1fr_1.4fr_auto_auto] items-start gap-3 border-b border-[#edf0f5] px-4 py-3 last:border-b-0">
      <span className="text-[13.5px] font-semibold text-ink">{row.title}</span>
      <span className="text-[12.5px] leading-relaxed text-muted">{detail}</span>
      <span className="whitespace-nowrap text-[12px] text-muted">
        {timeAgo(row.createdAt)}
      </span>
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.bg} ${tone.text}`}
      >
        {kindLabel(row.kind)}
      </span>
    </div>
  );
}

function Metric({
  value,
  label,
  tone = "text-ink",
  badge,
}: {
  value: string;
  label: string;
  tone?: string;
  badge?: SetupBadgeKind;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-white px-4 pb-3.5 pt-4">
      <div
        className={`truncate text-2xl font-bold tracking-[-0.02em] ${badge ? "text-bad" : tone}`}
        title={value}
      >
        {badge ? <SetupBadge kind={badge} size="lg" /> : value}
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
