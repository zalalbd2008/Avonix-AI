"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import { actionSaveUptime } from "@/lib/uptime/actions";
import {
  UPTIME_INTERVALS,
  UPTIME_REGIONS,
  mergeUptimeSettings,
  uptimeConfigScore,
  type UptimeIntervalMinutes,
  type UptimeRegion,
  type UptimeSettings,
} from "@/lib/uptime/types";

const input =
  "w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

export function UptimeStudio({
  clientId,
  websiteId,
  websiteName,
  websiteUrl,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  initial?: Partial<UptimeSettings> | null;
}) {
  const [settings, setSettings] = useState(() =>
    mergeUptimeSettings(initial),
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => uptimeConfigScore(settings), [settings]);
  const emailHref = `/clients/${clientId}/websites/${websiteId}/email`;
  const statusLabel = settings.enabled ? "Armed" : "Off";
  const statusTone = settings.enabled ? "text-ok" : "text-muted";

  function patch(partial: Partial<UptimeSettings>) {
    setSettings((s) => mergeUptimeSettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
  }

  function toggleRegion(id: UptimeRegion) {
    const has = settings.regions.includes(id);
    const regions = has
      ? settings.regions.filter((r) => r !== id)
      : [...settings.regions, id];
    patch({ regions: regions.length ? regions : [id] });
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveUptime({
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

  return (
    <div>
      <PageHeader
        title="Uptime"
        subtitle={`Availability monitoring · ${websiteName}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <span className="text-[12px] font-semibold text-ok">Saved</span>
            ) : null}
            {error ? (
              <span className="max-w-[220px] text-[12px] font-medium text-bad">
                {error}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                settings.enabled
                  ? "bg-ok/10 text-ok"
                  : "bg-[#eef2f7] text-faint"
              }`}
            >
              {settings.enabled ? "Monitoring on" : "Monitoring off"}
            </span>
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
          value={statusLabel}
          label="Monitor"
          tone={statusTone}
          badge={statusLabel === "Off" ? "setup" : undefined}
        />
        <Metric
          value="—"
          label="Uptime (30d)"
          hint="After first checks"
          badge="demo"
        />
        <Metric value="Never" label="Last check" badge="demo" />
        <Metric
          value={`${score}%`}
          label="Config readiness"
          tone={
            score >= 70 ? "text-ok" : score >= 40 ? "text-warn" : "text-muted"
          }
          badge={score < 40 ? "setup" : undefined}
        />
      </div>

      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          settings.enabled
            ? "border-ok/25 bg-ok/5"
            : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            settings.enabled ? "bg-ok" : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          {settings.enabled ? (
            <p>
              <b className="font-semibold text-ink">Monitor armed.</b>{" "}
              <span className="text-muted">
                Avonix will probe{" "}
                <span className="font-mono text-[12px] text-ink">
                  {websiteUrl}
                </span>{" "}
                every {settings.intervalMinutes} min from{" "}
                {settings.regions.length} region
                {settings.regions.length === 1 ? "" : "s"}. Reports go to the
                address set under{" "}
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
              <b className="font-semibold text-ink">Monitoring is off.</b>{" "}
              <span className="text-muted">
                Configure the probe below, then turn monitoring on and save.
                Alerts use the website{" "}
                <Link
                  href={emailHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  SMTP Setup
                </Link>
                .
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section title="Monitor" subtitle="How often we check this website">
            <Toggle
              label="Enable uptime monitoring"
              description={`Checks ${websiteUrl}`}
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
            />
            <div className="rounded-lg border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5 text-[13px]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Target site
              </p>
              <p className="mt-1 break-all font-mono text-[12.5px] text-ink">
                {websiteUrl}
              </p>
            </div>
            <Field label="Check interval">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {UPTIME_INTERVALS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      patch({
                        intervalMinutes: opt.id as UptimeIntervalMinutes,
                      })
                    }
                    className={`rounded-lg border px-2 py-2 text-[12px] font-semibold ${
                      settings.intervalMinutes === opt.id
                        ? "border-brand bg-brand/5 text-ink"
                        : "border-line text-muted hover:border-[#c3ccd9] hover:text-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Timeout (seconds)">
                <input
                  type="number"
                  min={3}
                  max={60}
                  step={1}
                  className={input}
                  value={settings.timeoutSeconds}
                  onChange={(e) =>
                    patch({ timeoutSeconds: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Expected status codes">
                <input
                  className={input}
                  value={settings.expectedStatusCodes.join(", ")}
                  placeholder="200, 201, 204"
                  onChange={(e) => {
                    const parts = e.target.value
                      .split(/[,\s]+/)
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setSettings((s) => ({
                      ...s,
                      expectedStatusCodes: parts
                        .map(Number)
                        .filter((n) => Number.isFinite(n))
                        .map((n) => Math.round(n)),
                    }));
                    setSaved(false);
                    setError(null);
                  }}
                />
              </Field>
            </div>
            <Field label="Keyword check (optional)">
              <input
                className={input}
                value={settings.keyword}
                placeholder="Text that must appear in the response"
                onChange={(e) => patch({ keyword: e.target.value })}
              />
            </Field>
          </Section>

          <Section title="Regions" subtitle="Where probes originate">
            <div className="space-y-2">
              {UPTIME_REGIONS.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#eef2f7] px-3 py-2.5 text-[13px] hover:bg-[#f8fafc]"
                >
                  <input
                    type="checkbox"
                    checked={settings.regions.includes(r.id)}
                    onChange={() => toggleRegion(r.id)}
                  />
                  <span className="font-medium text-ink">{r.label}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="SSL" subtitle="Certificate expiry warnings">
            <Toggle
              label="Watch SSL expiry"
              description="Warn before the certificate lapses"
              checked={settings.sslExpiryWatch}
              onChange={(sslExpiryWatch) => patch({ sslExpiryWatch })}
            />
            <Field label="Warn days before expiry">
              <input
                type="number"
                min={1}
                max={90}
                step={1}
                className={input}
                disabled={!settings.sslExpiryWatch}
                value={settings.sslWarnDays}
                onChange={(e) =>
                  patch({ sslWarnDays: Number(e.target.value) })
                }
              />
            </Field>
          </Section>

          <Section
            title="Alerts"
            subtitle="Reports use this website’s SMTP Setup"
          >
            <div className="rounded-lg border border-[#eef2f7] bg-[#f8fafc] px-3 py-3 text-[13px]">
              <p className="text-muted">
                Down / recovery reports are sent to the mail configured under{" "}
                <Link
                  href={emailHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  SMTP Setup · alerts & campaigns
                </Link>{" "}
                for this website — no separate alert address here.
              </p>
            </div>
            <Toggle
              label="Alert when down"
              description="Notify when the probe fails consecutive checks"
              checked={settings.alertOnDown}
              onChange={(alertOnDown) => patch({ alertOnDown })}
            />
            <Toggle
              label="Alert on recovery"
              description="Notify when the site comes back up"
              checked={settings.alertOnRecovery}
              onChange={(alertOnRecovery) => patch({ alertOnRecovery })}
            />
          </Section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Probe summary
            </h2>
            <dl className="px-4 py-2 text-[13px]">
              {(
                [
                  ["Target", websiteUrl],
                  ["Interval", `Every ${settings.intervalMinutes} min`],
                  ["Timeout", `${settings.timeoutSeconds}s`],
                  ["Regions", settings.regions.join(", ").toUpperCase() || "—"],
                  [
                    "Status codes",
                    settings.expectedStatusCodes.join(", ") || "—",
                  ],
                  ["Keyword", settings.keyword || "None"],
                  [
                    "SSL watch",
                    settings.sslExpiryWatch
                      ? `${settings.sslWarnDays} days`
                      : "Off",
                  ],
                  ["Alerts via", "SMTP Setup"],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="flex gap-3 border-b border-[#f6f8fa] py-2.5 last:border-0"
                >
                  <dt className="w-24 shrink-0 text-muted">{k}</dt>
                  <dd className="min-w-0 break-all text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Check history
            </h2>
            <div className="px-4 py-8 text-center">
              <p className="text-[13px] font-semibold text-ink">No checks yet</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                Response times and up/down events will list here after the
                monitor runs its first cycle.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
  tone = "text-ink",
  hint,
  badge,
}: {
  value: string;
  label: string;
  tone?: string;
  hint?: string;
  badge?: SetupBadgeKind;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-white px-4 pb-3.5 pt-4">
      <div
        className={`text-2xl font-bold tracking-[-0.02em] ${badge ? "text-bad" : tone}`}
      >
        {badge ? (
          <SetupBadge kind={badge} size="lg" />
        ) : (
          <>
            {value}
            {hint ? (
              <span className="ml-1 text-[13px] font-semibold text-faint">
                {hint}
              </span>
            ) : null}
          </>
        )}
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
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
