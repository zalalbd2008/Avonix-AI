"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import {
  actionConnectIntegration,
  actionDisconnectIntegration,
  actionSaveIntegrations,
} from "@/lib/integrations/actions";
import {
  connectionFor,
  integrationsConfigScore,
  mergeIntegrationsSettings,
  optionalMeta,
  type IntegrationsSettings,
  type IntegrationsSnapshot,
  type OptionalIntegrationId,
} from "@/lib/integrations/types";

const input =
  "w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

export function IntegrationsStudio({
  clientId,
  websiteId,
  websiteName,
  snapshot,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  snapshot: IntegrationsSnapshot;
  initial?: Partial<IntegrationsSettings> | null;
}) {
  const [settings, setSettings] = useState(() =>
    mergeIntegrationsSettings(initial),
  );
  const [editing, setEditing] = useState<OptionalIntegrationId | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/clients/${clientId}/websites/${websiteId}`;
  const score = useMemo(() => integrationsConfigScore(settings), [settings]);
  const automationHref = `${base}/automation`;
  const optionalRows = useMemo(
    () =>
      snapshot.optional.map((card) => ({
        card,
        meta: optionalMeta(card.id),
      })),
    [snapshot.optional],
  );

  function patchConnection(
    id: OptionalIntegrationId,
    partial: Partial<ReturnType<typeof connectionFor>>,
  ) {
    setSettings((s) =>
      mergeIntegrationsSettings({
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, ...partial } : c,
        ),
      }),
    );
    setSaved(false);
    setError(null);
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveIntegrations({
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

  function connect(id: OptionalIntegrationId) {
    startTransition(async () => {
      const conn = connectionFor(settings, id);
      const res = await actionConnectIntegration({
        websiteId,
        clientId,
        id,
        settings: mergeIntegrationsSettings({ connections: settings.connections }),
        label: conn.label,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSettings((s) =>
        mergeIntegrationsSettings({
          connections: s.connections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  connected: true,
                  connectedAt: new Date().toISOString(),
                }
              : c,
          ),
        }),
      );
      setEditing(null);
    });
  }

  function disconnect(id: OptionalIntegrationId) {
    startTransition(async () => {
      const res = await actionDisconnectIntegration({
        websiteId,
        clientId,
        id,
        settings,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSettings((s) =>
        mergeIntegrationsSettings({
          connections: s.connections.map((c) =>
            c.id === id
              ? {
                  ...c,
                  connected: false,
                  apiKey: "",
                  webhookUrl: "",
                  connectedAt: "",
                  meta: {},
                }
              : c,
          ),
        }),
      );
      setEditing(null);
    });
  }

  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle={`Core works offline — optional layers on top · ${websiteName}`}
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
              href={automationHref as never}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand"
            >
              Auto rules
            </Link>
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
          value={`${snapshot.stats.coreActive}/${snapshot.stats.coreTotal}`}
          label="Core modules active"
          tone={
            snapshot.stats.coreActive >= 8
              ? "text-ok"
              : snapshot.stats.coreActive >= 4
                ? "text-ink"
                : "text-warn"
          }
        />
        <Metric
          value={String(snapshot.stats.optionalConnected)}
          label="Optional connected"
          tone={
            snapshot.stats.optionalConnected > 0 ? "text-brand" : "text-muted"
          }
        />
        <Metric
          value={snapshot.website.status === "connected" ? "Online" : "Pending"}
          label="Connector"
          tone={
            snapshot.website.status === "connected" ? "text-ok" : "text-warn"
          }
        />
        <Metric
          value={`${score}%`}
          label="Integration readiness"
          tone={
            score >= 70 ? "text-ok" : score >= 40 ? "text-warn" : "text-muted"
          }
        />
      </div>

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-ok/25 bg-ok/5 px-4 py-3 text-[13px]">
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ok" />
        <p>
          <b className="font-semibold text-ink">Zero dependency by default.</b>{" "}
          <span className="text-muted">
            Level 1 modules run through the Avonix connector — no third party
            required. Add Level 2 webhooks or API keys only when you need
            Telegram, Slack, cloud backup, etc. Social posting also lives under{" "}
            <Link
              href={automationHref as never}
              className="font-semibold text-brand hover:underline"
            >
              Auto rules
            </Link>
            .
          </span>
        </p>
      </div>

      <div className="space-y-4">
        <LevelCard
          level={1}
          title="Zero Dependency"
          subtitle="100% offline — no third party needed"
          tone="ok"
        >
          <div className="flex flex-wrap gap-2">
            {snapshot.coreModules.map((mod) => (
              <CorePill key={mod.id} module={mod} />
            ))}
          </div>
        </LevelCard>

        <LevelCard
          level={2}
          title="Optional Integrations"
          subtitle="Enable with your own API key or webhook"
          tone="brand"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {optionalRows.map(({ card, meta }) => {
              const conn = connectionFor(settings, card.id);
              const open = editing === card.id;
              return (
                <div
                  key={card.id}
                  className="rounded-lg border border-[#e8edf5] bg-[#fcfdfe] p-3"
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">
                        {card.label}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">
                        {card.hint}
                      </p>
                      {card.connected ? (
                        <p className="mt-1 text-[11px] font-semibold text-ok">
                          {card.labelText}
                          {card.viaAutomation && !conn.connected
                            ? " · via Auto rules"
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    {conn.connected || card.connected ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (conn.connected) disconnect(card.id);
                          else setEditing(card.id);
                        }}
                        className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-semibold text-muted hover:border-[#c3ccd9] hover:text-ink disabled:opacity-50"
                      >
                        {conn.connected ? "Disconnect" : "Manage"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setEditing(open ? null : card.id)}
                        className="shrink-0 rounded-lg border border-brand/40 bg-brand/5 px-2.5 py-1 text-[11.5px] font-semibold text-brand hover:bg-brand/10 disabled:opacity-50"
                      >
                        Connect
                      </button>
                    )}
                  </div>

                  {open ? (
                    <div className="mt-3 space-y-2 border-t border-[#edf0f5] pt-3">
                      {meta.usesOAuth ? (
                        <>
                          <p className="text-[12px] text-muted">
                            Connect on the Backups page with one click — no API
                            keys to paste.
                          </p>
                          {conn.connected ? (
                            <p className="text-[12px] font-semibold text-ok">
                              {conn.label || `${meta.label} connected`}
                            </p>
                          ) : null}
                          <Link
                            href={`${base}/backups` as never}
                            className="inline-block rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark"
                          >
                            {conn.connected
                              ? "Manage on Backups"
                              : "Connect on Backups →"}
                          </Link>
                        </>
                      ) : (
                        <>
                      <Field label="Display name (optional)">
                        <input
                          className={input}
                          value={conn.label}
                          placeholder={meta.label}
                          onChange={(e) =>
                            patchConnection(card.id, { label: e.target.value })
                          }
                        />
                      </Field>
                      {meta.usesWebhook ? (
                        <Field
                          label={meta.webhookLabel ?? "Webhook URL"}
                        >
                          <input
                            className={input}
                            value={conn.webhookUrl}
                            placeholder="https://…"
                            onChange={(e) =>
                              patchConnection(card.id, {
                                webhookUrl: e.target.value,
                              })
                            }
                          />
                        </Field>
                      ) : null}
                      {meta.usesApiKey ? (
                        <Field label={meta.apiKeyLabel ?? "API key"}>
                          <input
                            className={input}
                            type="password"
                            value={conn.apiKey}
                            placeholder="Paste token"
                            onChange={(e) =>
                              patchConnection(card.id, {
                                apiKey: e.target.value,
                              })
                            }
                          />
                        </Field>
                      ) : null}
                      {card.viaAutomation ? (
                        <p className="text-[11.5px] text-muted">
                          Or connect {meta.label} under{" "}
                          <Link
                            href={automationHref as never}
                            className="font-semibold text-brand hover:underline"
                          >
                            Auto rules → Social
                          </Link>
                          .
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => connect(card.id)}
                          className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                        >
                          {pending ? "Connecting…" : "Connect"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-muted hover:text-ink"
                        >
                          Cancel
                        </button>
                      </div>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </LevelCard>

        <section className="overflow-hidden rounded-xl border border-navy bg-navy text-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3.5">
            <LevelBadge level={3} dark />
            <div>
              <h2 className="text-sm font-bold">Enterprise Cloud</h2>
              <p className="text-[12px] text-white/55">
                API and cloud powered
              </p>
            </div>
            <Link
              href="/licenses"
              className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark"
            >
              Upgrade
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-4">
            {snapshot.enterprise.map((item) => (
              <span
                key={item.id}
                title={item.hint}
                className={`rounded-full border px-3 py-1 text-[12.5px] ${
                  item.available
                    ? "border-white/25 text-white/90"
                    : "border-white/10 text-white/45"
                }`}
              >
                {item.label}
                {!item.available ? (
                  <span className="ml-1 text-[10px] uppercase tracking-wide text-white/35">
                    soon
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <div className="border-t border-white/10 px-4 py-3 text-[12px] text-white/55">
            WhatsApp Business and Chat AI model keys are configured per website
            today — open{" "}
            <Link
              href={`${base}/chat-ai` as never}
              className="font-semibold text-[#ff9a5c] hover:underline"
            >
              Chat AI
            </Link>{" "}
            or{" "}
            <Link
              href={automationHref as never}
              className="font-semibold text-[#ff9a5c] hover:underline"
            >
              Auto rules
            </Link>
            .
          </div>
        </section>
      </div>
    </div>
  );
}

function LevelCard({
  level,
  title,
  subtitle,
  tone,
  children,
}: {
  level: 1 | 2 | 3;
  title: string;
  subtitle: string;
  tone: "ok" | "brand";
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f5] px-4 py-3.5">
        <LevelBadge level={level} tone={tone} />
        <div>
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          <p className="text-[12px] text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function LevelBadge({
  level,
  tone = "ok",
  dark = false,
}: {
  level: 1 | 2 | 3;
  tone?: "ok" | "brand";
  dark?: boolean;
}) {
  if (dark) {
    return (
      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tracking-wide text-navy uppercase">
        Level {level}
      </span>
    );
  }
  const cls =
    tone === "brand"
      ? "bg-[rgba(255,102,0,.1)] text-brand"
      : "bg-[rgba(13,148,136,.1)] text-ok";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${cls}`}
    >
      Level {level}
    </span>
  );
}

function CorePill({
  module,
}: {
  module: IntegrationsSnapshot["coreModules"][number];
}) {
  const inner = (
    <>
      <span
        className={`font-bold ${module.active ? "text-ok" : "text-faint"}`}
      >
        {module.active ? "✓" : "○"}
      </span>
      {module.label}
    </>
  );

  if (module.href && module.active) {
    return (
      <Link
        href={module.href as never}
        title={module.hint}
        className="flex items-center gap-1.5 rounded-full border border-[#e8edf5] bg-[#f8fafc] px-3 py-1.5 text-[12.5px] font-medium text-ink hover:border-brand/30 hover:text-brand"
      >
        {inner}
      </Link>
    );
  }

  return (
    <span
      title={module.hint}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${
        module.active
          ? "border-[#e8edf5] bg-[#f8fafc] text-ink"
          : "border-[#eef2f7] bg-white text-muted"
      }`}
    >
      {inner}
    </span>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-ink">
        {label}
      </span>
      {children}
    </label>
  );
}
