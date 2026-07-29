"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ScrollTable } from "@/components/ui/scroll-table";
import {
  actionQueueBackupNow,
  actionSaveBackups,
  actionStartDriveOAuth,
  actionDisconnectDrive,
} from "@/lib/backups/actions";
import {
  BACKUP_SCHEDULES,
  RETENTION_OPTIONS,
  backupStatusLabel,
  backupStatusTone,
  backupsConfigScore,
  formatRunDay,
  formatRunHour,
  mergeBackupsSettings,
  newBackupId,
  destinationLabel,
  backupProgressPercent,
  type BackupDestinationId,
  type BackupHistoryEntry,
  type BackupsSettings,
  type BackupsSnapshot,
} from "@/lib/backups/types";

const input =
  "w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

export function BackupsStudio({
  clientId,
  websiteId,
  websiteName,
  snapshot,
  initial,
  driveAuth,
  driveAvailable = false,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  snapshot: BackupsSnapshot;
  initial?: Partial<BackupsSettings> | null;
  driveAuth?: {
    connected: boolean;
    email: string;
  } | null;
  /** Platform has GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (super admin env). */
  driveAvailable?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState(() =>
    mergeBackupsSettings(initial),
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [driveConnected, setDriveConnected] = useState(
    driveAuth?.connected ?? false,
  );
  const [driveEmail, setDriveEmail] = useState(driveAuth?.email ?? "");
  const [triggerNote, setTriggerNote] = useState<string | null>(null);
  const [startingBackup, setStartingBackup] = useState(false);

  const oauthStatus = searchParams.get("oauth");
  useEffect(() => {
    if (oauthStatus === "ok") {
      setDriveConnected(true);
      router.refresh();
    }
  }, [oauthStatus, router]);

  // Keep local history in sync while server polls (progress updates).
  useEffect(() => {
    if (!initial) return;
    setSettings((prev) => {
      const next = mergeBackupsSettings(initial);
      // Preserve unsaved form toggles if history is the only change we care about mid-run.
      const active = next.history.some(
        (h) => h.status === "pending" || h.status === "running",
      );
      if (!active && pending) return prev;
      return {
        ...prev,
        history: next.history,
      };
    });
  }, [initial, pending]);

  function connectDrive() {
    setError(null);
    startTransition(async () => {
      const res = await actionStartDriveOAuth({ websiteId, clientId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    });
  }

  function disconnectDrive() {
    startTransition(async () => {
      const res = await actionDisconnectDrive({ websiteId, clientId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDriveConnected(false);
      setDriveEmail("");
      if (settings.destination === "google_drive") {
        patch({ destination: "none" });
      }
      router.refresh();
    });
  }

  const base = `/clients/${clientId}/websites/${websiteId}`;
  const integrationsHref = `${base}/integrations`;
  const emailHref = `${base}/email`;
  const score = useMemo(() => backupsConfigScore(settings), [settings]);

  const history = useMemo(
    () =>
      [...settings.history].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [settings.history],
  );

  function patch(partial: Partial<BackupsSettings>) {
    setSettings((s) => mergeBackupsSettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveBackups({
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

  function backupNow() {
    const parts: string[] = [];
    if (settings.includeDatabase) parts.push("database");
    if (settings.includeUploads) parts.push("uploads");
    const scope = parts.length ? parts.join(" + ") : "files";
    const entry = {
      id: newBackupId(),
      label: new Date().toLocaleString(),
      detail: `Full backup · ${scope} · ${destinationLabel(settings.destination)}`,
      status: "pending" as const,
      destination: settings.destination,
      sizeLabel: "",
      createdAt: new Date().toISOString(),
      progress: 0,
    };
    const next = mergeBackupsSettings({
      ...settings,
      history: [entry, ...settings.history].slice(0, 100),
    });
    setSettings(next);
    setTriggerNote(null);
    setStartingBackup(true);
    startTransition(async () => {
      const res = await actionQueueBackupNow({
        websiteId,
        clientId,
        settings: next,
      });
      setStartingBackup(false);
      if (!res.ok) {
        setError(res.error);
        setSettings(settings);
        return;
      }
      if (res.triggered) {
        setTriggerNote(null);
      } else if (res.triggerNote) {
        setTriggerNote(res.triggerNote);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    });
  }

  const activeJob = useMemo(
    () =>
      history.find((h) => h.status === "running") ??
      history.find((h) => h.status === "pending") ??
      null,
    [history],
  );
  const hasQueued = Boolean(activeJob && activeJob.status === "pending");
  const hasRunning = Boolean(activeJob && activeJob.status === "running");
  const siteConnected = snapshot.website.status === "connected";
  const activeProgress = activeJob ? backupProgressPercent(activeJob) : 0;

  useEffect(() => {
    if (!hasQueued && !hasRunning) return;
    const id = window.setInterval(() => router.refresh(), 2000);
    return () => window.clearInterval(id);
  }, [hasQueued, hasRunning, router]);

  const [displayProgress, setDisplayProgress] = useState(activeProgress);
  useEffect(() => {
    setDisplayProgress((p) => Math.max(p, activeProgress));
  }, [activeProgress]);
  useEffect(() => {
    if (!hasQueued && !hasRunning) {
      setDisplayProgress(0);
      return;
    }
    if (hasQueued && displayProgress < 8) {
      const id = window.setInterval(() => {
        setDisplayProgress((p) => (p < 8 ? p + 0.4 : p));
      }, 400);
      return () => window.clearInterval(id);
    }
    if (hasRunning && displayProgress < 92 && activeProgress < 90) {
      const id = window.setInterval(() => {
        setDisplayProgress((p) => {
          const cap = Math.min(92, Math.max(activeProgress + 6, p + 0.35));
          return p < cap ? Math.min(cap, p + 0.35) : p;
        });
      }, 500);
      return () => window.clearInterval(id);
    }
  }, [hasQueued, hasRunning, displayProgress, activeProgress]);

  const destReady =
    settings.destination !== "none" &&
    (settings.destination === "google_drive"
      ? driveConnected
      : snapshot.destinationOptions.some(
          (d) => d.id === settings.destination && d.connected,
        ));

  return (
    <div>
      <PageHeader
        title="Backups"
        subtitle={`Automatic backups & restore points · ${websiteName}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <span className="text-[12px] font-semibold text-ok">Saved</span>
            ) : null}
            {triggerNote ? (
              <span className="max-w-[280px] text-[12px] font-medium text-brand">
                {triggerNote}
              </span>
            ) : null}
            {error ? (
              <span className="max-w-[240px] text-[12px] font-medium text-bad">
                {error}
              </span>
            ) : null}
            <Link
              href={integrationsHref as never}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand"
            >
              Integrations
            </Link>
            <button
              type="button"
              disabled={pending || settings.destination === "none"}
              onClick={backupNow}
              className="rounded-lg border border-brand/40 bg-brand/5 px-3.5 py-2 text-[13px] font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              {pending || startingBackup ? "Starting…" : "Backup now"}
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

      {activeJob ? (
        <div
          className={`mb-4 rounded-xl border px-4 py-4 ${
            siteConnected
              ? "border-brand/30 bg-[rgba(255,102,0,.06)]"
              : "border-bad/30 bg-[rgba(220,38,38,.06)]"
          }`}
        >
          {!siteConnected ? (
            <p className="text-[13px] text-bad">
              Backup is queued but this site is not connected. Install the
              Avonix connector plugin on WordPress and paste the connector key
              under website settings.
            </p>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-ink">
                  {hasRunning ? "Backup in progress" : "Starting backup…"}
                </p>
                <span className="text-[13px] font-bold tabular-nums text-brand">
                  {Math.round(Math.min(100, displayProgress))}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-[#e8edf5]">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(2, displayProgress))}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[12.5px] text-muted">
                {activeJob.detail ||
                  (hasRunning
                    ? "Working on your WordPress site…"
                    : "Waiting for the connector to pick up the job…")}
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          value={snapshot.stats.lastBackupLabel}
          label="Last backup"
          tone={snapshot.stats.lastBackupTone}
        />
        <Metric
          value={String(snapshot.stats.restorePoints)}
          label="Restore points"
          tone={
            snapshot.stats.restorePoints > 0 ? "text-ok" : "text-muted"
          }
        />
        <Metric value={snapshot.stats.sizeLabel} label="Latest size" />
        <Metric
          value={snapshot.stats.destinationLabel}
          label="Destination"
          tone={
            snapshot.stats.destinationLabel === "—"
              ? "text-warn"
              : "text-ink"
          }
        />
      </div>

      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          settings.enabled && destReady
            ? "border-ok/25 bg-ok/5"
            : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            settings.enabled && destReady ? "bg-ok" : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          {settings.enabled && destReady ? (
            <p>
              <b className="font-semibold text-ink">Backup monitor armed.</b>{" "}
              <span className="text-muted">
                {settings.schedule === "manual"
                  ? "Manual runs only — click Backup now when you need a restore point."
                  : settings.schedule === "daily"
                    ? `Daily at ${formatRunHour(settings.runHourUtc)} to ${snapshot.stats.destinationLabel}.`
                    : `${formatRunDay(settings.runDayUtc)}s at ${formatRunHour(settings.runHourUtc)} to ${snapshot.stats.destinationLabel}.`}{" "}
                Failures can alert via{" "}
                <Link
                  href={emailHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  SMTP Setup
                </Link>
                .
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">
                Avonix does not store site files.
              </b>{" "}
              <span className="text-muted">
                Pick a destination below — Google Drive is one click with
                Connect with Google.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section title="Schedule" subtitle="When to request a full backup">
            <Toggle
              label="Enable automatic backups"
              description="Queues runs for the connector — files stay on your destination"
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
            />
            <Field label="Schedule">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {BACKUP_SCHEDULES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ schedule: opt.id })}
                    className={`rounded-lg border px-3 py-2.5 text-left text-[12.5px] ${
                      settings.schedule === opt.id
                        ? "border-brand bg-brand/5 font-semibold text-ink"
                        : "border-line text-muted hover:border-[#c3ccd9] hover:text-ink"
                    }`}
                  >
                    {opt.label}
                    <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                      {opt.hint}
                    </span>
                  </button>
                ))}
              </div>
            </Field>
            {settings.schedule !== "manual" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Run hour (UTC)">
                  <select
                    className={input}
                    value={settings.runHourUtc}
                    onChange={(e) =>
                      patch({ runHourUtc: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {formatRunHour(h)}
                      </option>
                    ))}
                  </select>
                </Field>
                {settings.schedule === "weekly" ? (
                  <Field label="Run day">
                    <select
                      className={input}
                      value={settings.runDayUtc}
                      onChange={(e) =>
                        patch({ runDayUtc: Number(e.target.value) })
                      }
                    >
                      {Array.from({ length: 7 }, (_, d) => (
                        <option key={d} value={d}>
                          {formatRunDay(d)}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
              </div>
            ) : null}
            <Field label="Retention">
              <div className="flex flex-wrap gap-2">
                {RETENTION_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => patch({ retentionDays: days })}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-semibold ${
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

          <Section
            title="Destination"
            subtitle="Where backup archives are delivered"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {snapshot.destinationOptions.map((opt) => {
                const selected = settings.destination === opt.id;
                const isDrive = opt.id === "google_drive";
                const isConnected = isDrive ? driveConnected : opt.connected;
                const needsConnect =
                  opt.id !== "host" && opt.id !== "none" && !isConnected;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={needsConnect && !isDrive}
                    onClick={() => {
                      if (isDrive && !driveConnected) {
                        patch({ destination: "google_drive" });
                        if (driveAvailable) connectDrive();
                        return;
                      }
                      patch({ destination: opt.id as BackupDestinationId });
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-left text-[13px] ${
                      selected
                        ? "border-brand bg-brand/5 font-semibold text-ink"
                        : needsConnect && !isDrive
                          ? "cursor-not-allowed border-[#eef2f7] bg-[#fafbfc] text-faint"
                          : "border-line text-muted hover:border-[#c3ccd9] hover:text-ink"
                    }`}
                  >
                    {opt.label}
                    {isDrive && driveConnected ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-ok">
                        {driveEmail}
                      </span>
                    ) : isDrive && !driveAvailable ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-warn">
                        Not enabled — contact admin
                      </span>
                    ) : isDrive ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-brand">
                        Connect with Google
                      </span>
                    ) : needsConnect ? (
                      <span className="mt-0.5 block text-[11px] font-normal">
                        Connect under Integrations first
                      </span>
                    ) : isConnected ? (
                      <span className="mt-0.5 block text-[11px] font-normal text-ok">
                        Ready
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {settings.destination === "google_drive" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {driveConnected ? (
                  <>
                    <span className="text-[12.5px] text-ok">
                      Connected as <b>{driveEmail}</b> · uploads go to
                      &quot;Avonix Backups&quot; on Drive
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={disconnectDrive}
                      className="text-[12px] font-semibold text-bad hover:underline disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  </>
                ) : driveAvailable ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={connectDrive}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#dbe1ea] bg-white px-4 py-2 text-[13px] font-semibold text-ink shadow-sm hover:border-brand hover:text-brand disabled:opacity-60"
                  >
                    <GoogleIcon />
                    {pending ? "Redirecting…" : "Connect with Google"}
                  </button>
                ) : (
                  <p className="text-[12.5px] text-muted">
                    Google Drive backup is not enabled on this platform. Ask
                    your administrator to configure it.
                  </p>
                )}
              </div>
            ) : null}
          </Section>

          <Section title="Backup history" subtitle="Queued and completed runs">
            {history.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-faint">
                No backups yet — connect a destination and click Backup now.
              </p>
            ) : (
              <ScrollTable minWidth={640}>
                <div className="grid grid-cols-[1fr_1.2fr_auto_auto] gap-3 border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                  <span>When</span>
                  <span>Detail</span>
                  <span>Size</span>
                  <span>Status</span>
                </div>
                {history.map((row) => (
                  <HistoryRow key={row.id} row={row} />
                ))}
              </ScrollTable>
            )}
          </Section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Readiness
            </h2>
            <div className="space-y-3 px-4 py-4">
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
              <Toggle
                label="Include database"
                checked={settings.includeDatabase}
                onChange={(includeDatabase) => patch({ includeDatabase })}
              />
              <Toggle
                label="Include uploads"
                checked={settings.includeUploads}
                onChange={(includeUploads) => patch({ includeUploads })}
              />
              <Toggle
                label="Email on failure"
                checked={settings.notifyOnFailure}
                onChange={(notifyOnFailure) => patch({ notifyOnFailure })}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Notes
            </h2>
            <ul className="space-y-2 px-4 py-4 text-[12.5px] text-muted">
              <li>
                Restore runs on the host or backup plugin — Avonix tracks status
                and restore points only.
              </li>
              <li>
                Cloud destinations reuse credentials from{" "}
                <Link
                  href={integrationsHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Integrations
                </Link>
                .
              </li>
              <li>
                Failed jobs can auto-retry via{" "}
                <Link
                  href={`${base}/automation` as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Auto rules
                </Link>{" "}
                (Backup failed → retry).
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: BackupHistoryEntry }) {
  const tone = backupStatusTone(row.status);
  const showBar = row.status === "pending" || row.status === "running";
  const pct = backupProgressPercent(row);
  return (
    <div className="grid grid-cols-[1fr_1.2fr_auto_auto] items-center gap-3 border-b border-[#edf0f5] px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{row.label}</span>
        {showBar ? (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-500"
              style={{ width: `${Math.max(2, pct)}%` }}
            />
          </div>
        ) : null}
      </div>
      <span className="text-[12.5px] text-muted">{row.detail}</span>
      <span className="text-[12px] text-muted">{row.sizeLabel || "—"}</span>
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.bg} ${tone.text}`}
      >
        {showBar ? `${pct}%` : backupStatusLabel(row.status)}
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
      <div className="space-y-4 px-4 py-4">{children}</div>
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
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-[13px] font-semibold text-ink">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 block text-[12px] text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
