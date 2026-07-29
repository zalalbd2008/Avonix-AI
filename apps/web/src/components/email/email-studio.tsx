"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import {
  actionSaveWebsiteEmail,
  actionStartWebsiteEmailOauth,
} from "@/lib/website-email/actions";
import {
  SMTP_AUTH_MODES,
  SMTP_ENCRYPTION,
  isSmtpOauthVerified,
  mergeWebsiteEmailSettings,
  smtpDefaultsForAuthMode,
  smtpStatusLabel,
  websiteEmailConfigScore,
  type SmtpAuthMode,
  type WebsiteEmailSettings,
} from "@/lib/website-email/types";

const input =
  "w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

export function EmailStudio({
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
  initial?: Partial<WebsiteEmailSettings> | null;
}) {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState(() =>
    mergeWebsiteEmailSettings(initial),
  );
  const [pending, startTransition] = useTransition();
  const [oauthPending, setOauthPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthBanner, setOauthBanner] = useState<string | null>(null);

  const score = useMemo(() => websiteEmailConfigScore(settings), [settings]);
  const smtp = useMemo(() => smtpStatusLabel(settings), [settings]);
  const oauthOk = useMemo(() => isSmtpOauthVerified(settings), [settings]);
  const uptimeHref = `/clients/${clientId}/websites/${websiteId}/uptime`;
  const updatesHref = `/clients/${clientId}/websites/${websiteId}/updates`;
  const showOauth =
    settings.authMode === "google" || settings.authMode === "microsoft";

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (!oauth) return;
    if (oauth === "ok") {
      const email = searchParams.get("email");
      setOauthBanner(
        email
          ? `Verified with OAuth as ${email}. Settings saved.`
          : "OAuth verified. Settings saved.",
      );
    } else if (oauth === "denied") {
      setError(`OAuth denied: ${searchParams.get("reason") || "cancelled"}`);
    } else if (oauth === "error") {
      setError(searchParams.get("reason") || "OAuth verification failed.");
    }
  }, [searchParams]);

  function patch(partial: Partial<WebsiteEmailSettings>) {
    setSettings((s) => mergeWebsiteEmailSettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
    setOauthBanner(null);
  }

  function setAuthMode(mode: SmtpAuthMode) {
    patch(smtpDefaultsForAuthMode(mode));
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveWebsiteEmail({
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

  async function verifyOauth(provider: "google" | "microsoft") {
    setOauthPending(true);
    setError(null);
    setOauthBanner(null);
    const next = mergeWebsiteEmailSettings({
      ...settings,
      ...smtpDefaultsForAuthMode(provider),
      oauthClientId: settings.oauthClientId,
      oauthClientSecret: settings.oauthClientSecret,
    });
    setSettings(next);
    const res = await actionStartWebsiteEmailOauth({
      websiteId,
      clientId,
      provider,
      settings: next,
    });
    setOauthPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    window.location.assign(res.url);
  }

  return (
    <div>
      <PageHeader
        title="SMTP Setup"
        subtitle={`Outbound mail for alerts & campaigns · ${websiteName}`}
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
              {settings.enabled ? "SMTP on" : "SMTP off"}
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

      {oauthBanner ? (
        <div className="mb-4 rounded-xl border border-ok/25 bg-ok/5 px-4 py-3 text-[13px] text-ok">
          {oauthBanner}
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric value={smtp.label} label="SMTP" tone={smtp.tone} />
        <Metric
          value={settings.fromEmail || "—"}
          label="From"
          tone={settings.fromEmail ? "text-ink" : "text-muted"}
        />
        <Metric
          value={settings.notifyEmail || "—"}
          label="Alerts to"
          tone={settings.notifyEmail ? "text-ink" : "text-muted"}
        />
        <Metric
          value={`${score}%`}
          label="Config readiness"
          tone={
            score >= 70 ? "text-ok" : score >= 40 ? "text-warn" : "text-muted"
          }
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
              <b className="font-semibold text-ink">Outbound SMTP is on.</b>{" "}
              <span className="text-muted">
                Alerts from{" "}
                <Link
                  href={uptimeHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Uptime
                </Link>{" "}
                and{" "}
                <Link
                  href={updatesHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Updates
                </Link>{" "}
                use the notify address below. Sending through this SMTP is
                queued for the delivery worker.
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">SMTP is off.</b>{" "}
              <span className="text-muted">
                Configure the server and From identity for{" "}
                <span className="font-mono text-[12px] text-ink">
                  {websiteUrl}
                </span>
                , then enable and save. Campaign composer ships later — identity
                can be prepared now.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section
            title="SMTP"
            subtitle="Server used to send mail for this website"
          >
            <Toggle
              label="Enable outbound SMTP"
              description="Turn on when host and From address are ready"
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
            />

            <Field label="Authentication">
              <div className="grid gap-2 sm:grid-cols-3">
                {SMTP_AUTH_MODES.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAuthMode(opt.id)}
                    className={`rounded-lg border px-2.5 py-2 text-left ${
                      settings.authMode === opt.id
                        ? "border-brand bg-brand/5"
                        : "border-[#e8edf5] hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span className="block text-[12.5px] font-semibold text-ink">
                      {opt.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      {opt.hint}
                    </span>
                  </button>
                ))}
              </div>
            </Field>

            {showOauth ? (
              <div className="space-y-3 rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-3.5">
                <p className="text-[12.5px] text-muted">
                  Paste OAuth <b className="text-ink">Client ID</b> and{" "}
                  <b className="text-ink">Client Secret</b>, then Verify. Add
                  this redirect URI in the provider console:
                </p>
                <code className="block break-all rounded-lg border border-line bg-white px-2.5 py-2 font-mono text-[11px] text-ink">
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/api/website-email/oauth/${settings.authMode}/callback`}
                </code>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Client ID">
                    <input
                      className={input}
                      value={settings.oauthClientId}
                      placeholder={
                        settings.authMode === "google"
                          ? "xxxxx.apps.googleusercontent.com"
                          : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      }
                      autoComplete="off"
                      onChange={(e) => patch({ oauthClientId: e.target.value })}
                    />
                  </Field>
                  <Field label="Client Secret">
                    <input
                      className={input}
                      type="password"
                      value={settings.oauthClientSecret}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      onChange={(e) =>
                        patch({ oauthClientSecret: e.target.value })
                      }
                    />
                  </Field>
                </div>
                {oauthOk ? (
                  <div className="rounded-lg border border-ok/25 bg-ok/5 px-3 py-2.5 text-[12.5px] text-ok">
                    Verified as{" "}
                    <b className="font-semibold">
                      {settings.oauthVerifiedEmail}
                    </b>
                  </div>
                ) : (
                  <p className="text-[12px] text-warn">
                    Not verified yet — click Verify below.
                  </p>
                )}
                <button
                  type="button"
                  disabled={oauthPending}
                  onClick={() =>
                    void verifyOauth(
                      settings.authMode === "microsoft"
                        ? "microsoft"
                        : "google",
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-[#dbe1ea] bg-white px-3 py-2.5 text-[13px] font-semibold text-ink hover:bg-[#f4f6f9] disabled:opacity-60"
                >
                  {settings.authMode === "microsoft" ? (
                    <MicrosoftGlyph />
                  ) : (
                    <GoogleGlyph />
                  )}
                  {oauthPending
                    ? "Redirecting…"
                    : settings.authMode === "microsoft"
                      ? oauthOk
                        ? "Re-verify with Microsoft"
                        : "Verify with Microsoft"
                      : oauthOk
                        ? "Re-verify with Google"
                        : "Verify with Google"}
                </button>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Host">
                <input
                  className={input}
                  value={settings.host}
                  placeholder="smtp.example.com"
                  autoComplete="off"
                  onChange={(e) => patch({ host: e.target.value })}
                />
              </Field>
              <Field label="Port">
                <input
                  className={input}
                  type="number"
                  min={1}
                  max={65535}
                  value={settings.port}
                  onChange={(e) =>
                    patch({ port: Number(e.target.value) || 587 })
                  }
                />
              </Field>
            </div>
            <Field label="Encryption">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {SMTP_ENCRYPTION.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => patch({ encryption: opt.id })}
                    className={`rounded-lg border px-2 py-2 text-[12.5px] font-semibold ${
                      settings.encryption === opt.id
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-[#e8edf5] text-muted hover:bg-[#f8fafc]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>
            {!showOauth ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Username">
                  <input
                    className={input}
                    value={settings.username}
                    placeholder="user@example.com"
                    autoComplete="off"
                    onChange={(e) => patch({ username: e.target.value })}
                  />
                </Field>
                <Field label="Password">
                  <input
                    className={input}
                    type="password"
                    value={settings.password}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    onChange={(e) => patch({ password: e.target.value })}
                  />
                </Field>
              </div>
            ) : (
              <p className="text-[12px] text-muted">
                Username / password are unused in OAuth mode — SMTP uses the
                verified mailbox token after Verify.
              </p>
            )}
          </Section>

          <Section
            title="From identity"
            subtitle="How messages appear in the recipient inbox"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From name">
                <input
                  className={input}
                  value={settings.fromName}
                  placeholder={websiteName}
                  onChange={(e) => patch({ fromName: e.target.value })}
                />
              </Field>
              <Field label="From email">
                <input
                  className={input}
                  type="email"
                  value={settings.fromEmail}
                  placeholder="noreply@example.com"
                  onChange={(e) => patch({ fromEmail: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Reply-To (optional)">
              <input
                className={input}
                type="email"
                value={settings.replyTo}
                placeholder="support@example.com"
                onChange={(e) => patch({ replyTo: e.target.value })}
              />
            </Field>
          </Section>

          <Section
            title="Alerts"
            subtitle="Where Uptime and Updates digests are sent"
          >
            <Field label="Notify email">
              <input
                className={input}
                type="email"
                value={settings.notifyEmail}
                placeholder="alerts@example.com"
                onChange={(e) => patch({ notifyEmail: e.target.value })}
              />
            </Field>
            <p className="text-[12px] text-muted">
              Leave blank to skip digests until an address is set. This is
              separate from the SMTP From address.
            </p>
          </Section>

          <Section
            title="Campaigns"
            subtitle="Marketing sends for this website (composer later)"
          >
            <Toggle
              label="Prepare campaign identity"
              description="Store From / Reply-To for when campaign sending ships"
              checked={settings.campaignsEnabled}
              onChange={(campaignsEnabled) => patch({ campaignsEnabled })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Campaign from name">
                <input
                  className={input}
                  value={settings.campaignFromName}
                  placeholder={settings.fromName || websiteName}
                  disabled={!settings.campaignsEnabled}
                  onChange={(e) => patch({ campaignFromName: e.target.value })}
                />
              </Field>
              <Field label="Campaign reply-to">
                <input
                  className={input}
                  type="email"
                  value={settings.campaignReplyTo}
                  placeholder={settings.replyTo || settings.fromEmail}
                  disabled={!settings.campaignsEnabled}
                  onChange={(e) => patch({ campaignReplyTo: e.target.value })}
                />
              </Field>
            </div>
            <div className="rounded-lg border border-[#eef2f7] bg-[#f8fafc] px-3 py-3 text-[12.5px] text-muted">
              Campaign lists, templates and send history are not built yet.
              SMTP + alert mail are the v1 surface.
            </div>
          </Section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Summary
            </h2>
            <dl className="space-y-2.5 px-4 py-4 text-[13px]">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Status</dt>
                <dd className={`font-semibold ${smtp.tone}`}>{smtp.label}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Auth</dt>
                <dd className="text-ink">
                  {SMTP_AUTH_MODES.find((m) => m.id === settings.authMode)
                    ?.label ?? settings.authMode}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Encryption</dt>
                <dd className="text-ink">
                  {SMTP_ENCRYPTION.find((e) => e.id === settings.encryption)
                    ?.label ?? settings.encryption}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Host</dt>
                <dd className="min-w-0 truncate font-mono text-[12px] text-ink">
                  {settings.host || "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">OAuth</dt>
                <dd className="min-w-0 truncate text-ink">
                  {oauthOk ? settings.oauthVerifiedEmail : "Not verified"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Campaigns</dt>
                <dd className="text-ink">
                  {settings.campaignsEnabled ? "Identity set" : "Off"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Delivery log
            </h2>
            <div className="px-4 py-6 text-center text-[12px] text-muted">
              No sends yet. When SMTP delivery is wired, recent messages appear
              here.
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Uses this mailbox
            </h2>
            <ul className="divide-y divide-[#f1f4f8] text-[13px]">
              <li>
                <Link
                  href={uptimeHref as never}
                  className="block px-4 py-3 font-medium text-brand hover:bg-[#f8fafc]"
                >
                  Uptime alerts →
                </Link>
              </li>
              <li>
                <Link
                  href={updatesHref as never}
                  className="block px-4 py-3 font-medium text-brand hover:bg-[#f8fafc]"
                >
                  Updates digests →
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.4l6.2 5.2C39.2 36.3 44 31.5 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function MicrosoftGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
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
