"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ScrollTable } from "@/components/ui/scroll-table";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import {
  actionQueueSecurityScan,
  actionSaveSecurity,
} from "@/lib/security/actions";
import {
  SCAN_INTERVALS,
  checkStatusLabel,
  checkStatusTone,
  mergeSecuritySettings,
  newSecurityScanId,
  scanIntervalLabel,
  scanStatusLabel,
  securityConfigScore,
  type SecurityCheckRow,
  type SecurityScanEntry,
  type SecuritySettings,
  type SecuritySnapshot,
} from "@/lib/security/types";

export function SecurityStudio({
  clientId,
  websiteId,
  websiteName,
  snapshot,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  snapshot: SecuritySnapshot;
  initial?: Partial<SecuritySettings> | null;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(() =>
    mergeSecuritySettings(initial),
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/clients/${clientId}/websites/${websiteId}`;
  const settingsHref = `${base}/settings`;
  const uptimeHref = `${base}/uptime`;
  const emailHref = `${base}/email`;
  const automationHref = `${base}/automation`;

  const score = useMemo(() => securityConfigScore(settings), [settings]);
  const scans = useMemo(
    () =>
      [...settings.scans].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [settings.scans],
  );

  function patch(partial: Partial<SecuritySettings>) {
    setSettings((s) => mergeSecuritySettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveSecurity({
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

  function runScan() {
    const entry = {
      id: newSecurityScanId(),
      label: new Date().toLocaleString(),
      detail: "Full malware + integrity scan queued for connector",
      status: "pending" as const,
      filesChecked: 0,
      createdAt: new Date().toISOString(),
    };
    const next = mergeSecuritySettings({
      ...settings,
      enabled: true,
      scans: [entry, ...settings.scans].slice(0, 50),
    });
    setSettings(next);
    startTransition(async () => {
      const res = await actionQueueSecurityScan({
        websiteId,
        clientId,
        settings: next,
      });
      if (!res.ok) {
        setError(res.error);
        setSettings(settings);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle={`Monitoring files, logins and hardening · ${websiteName}`}
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
            <Link
              href={settingsHref as never}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand"
            >
              Settings
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={runScan}
              className="rounded-lg border border-brand/40 bg-brand/5 px-3.5 py-2 text-[13px] font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
            >
              {pending ? "Queuing…" : "Run scan"}
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
          value={snapshot.stats.statusLabel}
          label="Security status"
          tone={snapshot.stats.statusTone}
          badge={
            snapshot.stats.statusLabel === "Disconnected"
              ? "connect"
              : snapshot.stats.statusLabel === "Monitor off"
                ? "setup"
                : undefined
          }
        />
        <Metric
          value={snapshot.stats.malwareLabel}
          label="Malware found"
          tone={snapshot.stats.malwareTone}
          badge={
            snapshot.stats.malwareLabel === "—" ? "setup" : undefined
          }
        />
        <Metric
          value={snapshot.stats.blockedLoginsLabel}
          label="Blocked logins"
          tone={snapshot.stats.blockedLoginsTone}
        />
        <Metric
          value={snapshot.stats.firewallLabel}
          label="Firewall"
          tone={snapshot.stats.firewallTone}
          badge={
            snapshot.stats.firewallLabel === "Off" ? "setup" : undefined
          }
        />
      </div>

      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          settings.enabled && snapshot.website.status === "connected"
            ? "border-ok/25 bg-ok/5"
            : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            settings.enabled && snapshot.website.status === "connected"
              ? "bg-ok"
              : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          {settings.enabled && snapshot.website.status === "connected" ? (
            <p>
              <b className="font-semibold text-ink">Monitor armed.</b>{" "}
              <span className="text-muted">
                Scans run {scanIntervalLabel(settings.scanIntervalHours).toLowerCase()}
                . Threats alert via{" "}
                <Link
                  href={emailHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  SMTP Setup
                </Link>{" "}
                and can trigger{" "}
                <Link
                  href={automationHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Auto rules
                </Link>
                .
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">Basic hardening first.</b>{" "}
              <span className="text-muted">
                Connect the plugin, enable the monitor below, then run a scan.
                Connector key rotation lives under{" "}
                <Link
                  href={settingsHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Settings
                </Link>
                .
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section
            title="Security checks"
            subtitle="Live posture from monitor settings and connector"
          >
            <ScrollTable minWidth={560}>
              <div className="grid grid-cols-[1fr_1.2fr_auto] gap-3 border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                <span>Check</span>
                <span>Detail</span>
                <span>Status</span>
              </div>
              {snapshot.checks.map((row) => (
                <CheckRow key={row.id} row={row} />
              ))}
            </ScrollTable>
          </Section>

          <Section title="Scan history" subtitle="Queued and completed scans">
            {scans.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-faint">
                No scans yet — click Run scan to queue the first check.
              </p>
            ) : (
              <ScrollTable minWidth={560}>
                <div className="grid grid-cols-[1fr_1.2fr_auto] gap-3 border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                  <span>When</span>
                  <span>Detail</span>
                  <span>Status</span>
                </div>
                {scans.map((row) => (
                  <ScanRow key={row.id} row={row} />
                ))}
              </ScrollTable>
            )}
          </Section>
        </div>

        <aside className="space-y-4">
          <Section title="Monitor" subtitle="What to watch on this website">
            <Toggle
              label="Enable security monitor"
              description="Track scans, login blocks and hardening checks"
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
            />
            <Toggle
              label="Web application firewall"
              description="Basic request filtering via connector rules"
              checked={settings.firewallEnabled}
              onChange={(firewallEnabled) => patch({ firewallEnabled })}
            />
            <Field label="Scan interval">
              <div className="flex flex-wrap gap-2">
                {SCAN_INTERVALS.map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => patch({ scanIntervalHours: hours })}
                    className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold ${
                      settings.scanIntervalHours === hours
                        ? "border-brand bg-brand text-white"
                        : "border-line text-muted hover:border-brand hover:text-brand"
                    }`}
                  >
                    {scanIntervalLabel(hours)}
                  </button>
                ))}
              </div>
            </Field>
            <Toggle
              label="Email on threat"
              checked={settings.notifyOnThreat}
              onChange={(notifyOnThreat) => patch({ notifyOnThreat })}
            />
          </Section>

          <Section title="Hardening" subtitle="WordPress surface reduction">
            <Toggle
              label="Block XML-RPC"
              checked={settings.blockXmlRpc}
              onChange={(blockXmlRpc) => patch({ blockXmlRpc })}
            />
            <Toggle
              label="Block REST user enumeration"
              checked={settings.blockRestUserEnum}
              onChange={(blockRestUserEnum) => patch({ blockRestUserEnum })}
            />
            <Toggle
              label="Hide WP version"
              checked={settings.hideWpVersion}
              onChange={(hideWpVersion) => patch({ hideWpVersion })}
            />
            <Toggle
              label="Watch malware signatures"
              checked={settings.watchMalware}
              onChange={(watchMalware) => patch({ watchMalware })}
            />
            <Toggle
              label="Watch failed logins"
              checked={settings.watchLogins}
              onChange={(watchLogins) => patch({ watchLogins })}
            />
            <Toggle
              label="Watch file changes"
              checked={settings.watchFileChanges}
              onChange={(watchFileChanges) => patch({ watchFileChanges })}
            />
            <Toggle
              label="Alert on new admins"
              checked={settings.watchNewAdmins}
              onChange={(watchNewAdmins) => patch({ watchNewAdmins })}
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
              />
              <p className="text-[12px] text-muted">
                SSL expiry is watched under{" "}
                <Link
                  href={uptimeHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Uptime
                </Link>
                . Security releases under{" "}
                <Link
                  href={`${base}/updates` as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Updates
                </Link>
                .
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function CheckRow({ row }: { row: SecurityCheckRow }) {
  const tone = checkStatusTone(row.status);
  return (
    <div className="grid grid-cols-[1fr_1.2fr_auto] items-start gap-3 border-b border-[#edf0f5] px-4 py-3 last:border-b-0">
      <span className="text-[13.5px] font-semibold text-ink">{row.title}</span>
      <span className="text-[12.5px] leading-relaxed text-muted">
        {row.detail}
      </span>
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.bg} ${tone.text}`}
      >
        {checkStatusLabel(row.status)}
      </span>
    </div>
  );
}

function ScanRow({ row }: { row: SecurityScanEntry }) {
  const tone =
    row.status === "success"
      ? "text-ok bg-[rgba(13,148,136,.1)]"
      : row.status === "failed"
        ? "text-bad bg-[rgba(220,38,38,.1)]"
        : row.status === "running"
          ? "text-brand bg-[rgba(255,102,0,.1)]"
          : "text-muted bg-[#f1f4f8]";
  return (
    <div className="grid grid-cols-[1fr_1.2fr_auto] items-center gap-3 border-b border-[#edf0f5] px-4 py-3 last:border-b-0">
      <span className="text-[13px] font-medium text-ink">{row.label}</span>
      <span className="text-[12.5px] text-muted">{row.detail}</span>
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}
      >
        {scanStatusLabel(row.status)}
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
