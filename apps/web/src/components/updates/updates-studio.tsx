"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { timeAgo } from "@/components/ui/status-pill";
import { CONNECTOR_VERSION, compareVersions } from "@/lib/connector/version";
import { actionSaveUpdates } from "@/lib/updates/actions";
import {
  availableItemActions,
  connectorUpdateState,
  makePendingAction,
  mergeUpdatesSettings,
  updateActionLabel,
  updatesConfigScore,
  type UpdateActionKind,
  type UpdateInventoryItem,
  type UpdatesSettings,
} from "@/lib/updates/types";

const input =
  "w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

export function UpdatesStudio({
  clientId,
  websiteId,
  websiteName,
  websiteUrl,
  websiteStatus,
  connectorVersion,
  lastSeenAt,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  websiteStatus: string;
  connectorVersion: string | null;
  lastSeenAt: string | Date | null;
  initial?: Partial<UpdatesSettings> | null;
}) {
  const [settings, setSettings] = useState(() =>
    mergeUpdatesSettings(initial),
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => updatesConfigScore(settings), [settings]);
  const emailHref = `/clients/${clientId}/websites/${websiteId}/email`;
  const connector = connectorUpdateState(
    connectorVersion,
    CONNECTOR_VERSION,
    compareVersions,
  );
  const connected = websiteStatus === "connected";

  function patch(partial: Partial<UpdatesSettings>) {
    setSettings((s) => mergeUpdatesSettings({ ...s, ...partial }));
    setSaved(false);
    setError(null);
  }

  function save() {
    startTransition(async () => {
      const res = await actionSaveUpdates({
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

  const watched = [
    settings.watchCore && "Core",
    settings.watchPlugins && "Plugins",
    settings.watchThemes && "Themes",
    settings.watchConnector && "Connector",
  ].filter(Boolean) as string[];

  const managedItems = useMemo(() => {
    const fromConnector = settings.inventory;
    const items: UpdateInventoryItem[] = [];

    const hasCore = fromConnector.some((i) => i.targetType === "core");
    if (!hasCore) {
      items.push({
        id: "core",
        targetType: "core",
        slug: "wordpress",
        name: "WordPress core",
        version: "—",
        active: true,
        updateAvailable: false,
      });
    }

    const hasConnector = fromConnector.some((i) => i.targetType === "connector");
    if (!hasConnector) {
      items.push({
        id: "connector",
        targetType: "connector",
        slug: "avonix-connector",
        name: "Avonix connector",
        version: connectorVersion ? `v${connectorVersion}` : "—",
        latestVersion: `v${CONNECTOR_VERSION}`,
        active: connected,
        updateAvailable: connector.id === "update_available",
      });
    }

    return [...items, ...fromConnector];
  }, [
    settings.inventory,
    connectorVersion,
    connected,
    connector.id,
  ]);

  function queueAction(
    kind: UpdateActionKind,
    item: Pick<
      UpdateInventoryItem,
      "targetType" | "slug" | "name"
    >,
  ) {
    const action = makePendingAction({
      kind,
      targetType: item.targetType,
      slug: item.slug,
      label: item.name,
    });
    const next = mergeUpdatesSettings({
      ...settings,
      pendingActions: [action, ...settings.pendingActions].slice(0, 50),
    });
    setSettings(next);
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const res = await actionSaveUpdates({
        websiteId,
        clientId,
        settings: next,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  function cancelAction(id: string) {
    const next = mergeUpdatesSettings({
      ...settings,
      pendingActions: settings.pendingActions.filter((a) => a.id !== id),
    });
    setSettings(next);
    startTransition(async () => {
      const res = await actionSaveUpdates({
        websiteId,
        clientId,
        settings: next,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  const coreItems = managedItems.filter((i) => i.targetType === "core");
  const pluginItems = managedItems.filter((i) => i.targetType === "plugin");
  const themeItems = managedItems.filter((i) => i.targetType === "theme");
  const connectorItems = managedItems.filter(
    (i) => i.targetType === "connector",
  );

  return (
    <div>
      <PageHeader
        title="Updates"
        subtitle={`WordPress core, plugins and themes · ${websiteName}`}
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
              {settings.enabled ? "Watching" : "Paused"}
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
          value={connected ? "Connected" : websiteStatus}
          label="Site status"
          tone={connected ? "text-ok" : "text-warn"}
        />
        <Metric
          value={connectorVersion ? `v${connectorVersion}` : "—"}
          label="Connector on site"
        />
        <Metric
          value={`v${CONNECTOR_VERSION}`}
          label="Latest connector"
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
          connector.id === "update_available"
            ? "border-warn/30 bg-[#fff8f3]"
            : settings.enabled
              ? "border-ok/25 bg-ok/5"
              : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            connector.id === "update_available"
              ? "bg-warn"
              : settings.enabled
                ? "bg-ok"
                : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          <p>
            <b className="font-semibold text-ink">
              Connector {connector.label.toLowerCase()}.
            </b>{" "}
            <span className="text-muted">
              Watching {watched.length ? watched.join(", ") : "nothing"} on{" "}
              <span className="font-mono text-[12px] text-ink">
                {websiteUrl}
              </span>
              . Notifications use{" "}
              <Link
                href={emailHref as never}
                className="font-semibold text-brand hover:underline"
              >
                Email · SMTP and campaigns
              </Link>
              . Updates are applied in WordPress admin — Avonix reports versions,
              it does not push code to the server.
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Section
            title="Watch list"
            subtitle="What to track on this website"
          >
            <Toggle
              label="Enable update watching"
              description="Collect and surface available updates for this site"
              checked={settings.enabled}
              onChange={(enabled) => patch({ enabled })}
            />
            <div className="space-y-2">
              {(
                [
                  ["watchCore", "WordPress core"],
                  ["watchPlugins", "Plugins"],
                  ["watchThemes", "Themes"],
                  ["watchConnector", "Avonix connector"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[#eef2f7] px-3 py-2.5 text-[13px] hover:bg-[#f8fafc]"
                >
                  <input
                    type="checkbox"
                    checked={settings[key]}
                    disabled={!settings.enabled}
                    onChange={(e) => patch({ [key]: e.target.checked })}
                  />
                  <span className="font-medium text-ink">{label}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section
            title="Notifications"
            subtitle="Reports use this website’s Email (SMTP) settings"
          >
            <div className="rounded-lg border border-[#eef2f7] bg-[#f8fafc] px-3 py-3 text-[13px]">
              <p className="text-muted">
                Update digests go to the mail configured under{" "}
                <Link
                  href={emailHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Email · SMTP and campaigns
                </Link>{" "}
                for this website.
              </p>
            </div>
            <Toggle
              label="Notify when updates are available"
              description="Email when watched components fall behind"
              checked={settings.notifyOnAvailable}
              onChange={(notifyOnAvailable) => patch({ notifyOnAvailable })}
            />
            <Toggle
              label="Security / minor updates focus"
              description="Prefer security and minor releases in digests"
              checked={settings.securityOnly}
              onChange={(securityOnly) => patch({ securityOnly })}
            />
          </Section>

          <Section
            title="Exclusions"
            subtitle="Skip noisy plugins or themes (one slug per line)"
          >
            <Field label="Exclude plugins">
              <textarea
                className={`${input} min-h-[88px] resize-y font-mono text-[12px]`}
                value={settings.excludePlugins}
                placeholder={"akismet\nhello-dolly"}
                disabled={!settings.enabled || !settings.watchPlugins}
                onChange={(e) => patch({ excludePlugins: e.target.value })}
              />
            </Field>
            <Field label="Exclude themes">
              <textarea
                className={`${input} min-h-[88px] resize-y font-mono text-[12px]`}
                value={settings.excludeThemes}
                placeholder={"twentytwentyfour"}
                disabled={!settings.enabled || !settings.watchThemes}
                onChange={(e) => patch({ excludeThemes: e.target.value })}
              />
            </Field>
          </Section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Connector
            </h2>
            <div className="px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#f1f4f8] px-2 py-[3px] text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
                  Plugin
                </span>
                <span
                  className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${connector.tone}`}
                >
                  {connector.label}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-[13px]">
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">On site</dt>
                  <dd className="font-mono text-ink">
                    {connectorVersion ? `v${connectorVersion}` : "—"}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Latest</dt>
                  <dd className="font-mono text-ink">v{CONNECTOR_VERSION}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Last seen</dt>
                  <dd className="text-ink">
                    {lastSeenAt
                      ? timeAgo(
                          lastSeenAt instanceof Date
                            ? lastSeenAt
                            : new Date(lastSeenAt),
                        )
                      : "never"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex items-center justify-between border-b border-[#edf0f5] px-4 py-3">
              <h2 className="text-sm font-semibold">Pending actions</h2>
              <span className="text-[11px] font-semibold text-faint">
                {settings.pendingActions.length}
              </span>
            </div>
            {settings.pendingActions.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12px] text-muted">
                No queued actions. Use the ⋮ menu on software rows.
              </div>
            ) : (
              <ul className="divide-y divide-[#f1f4f8]">
                {settings.pendingActions.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-2 px-4 py-3 text-[13px]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">
                        {updateActionLabel(a.kind)}
                      </span>
                      <span className="block text-[12px] text-muted">
                        {a.label} · {a.targetType}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => cancelAction(a.id)}
                      className="shrink-0 text-[11px] font-semibold text-faint hover:text-bad"
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
              Summary
            </h2>
            <dl className="px-4 py-2 text-[13px]">
              {(
                [
                  ["Site", websiteUrl],
                  ["Watching", watched.join(", ") || "—"],
                  [
                    "Notify",
                    settings.notifyOnAvailable ? "Via Email" : "Off",
                  ],
                  [
                    "Focus",
                    settings.securityOnly ? "Security / minor" : "All updates",
                  ],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div
                  key={k}
                  className="flex gap-3 border-b border-[#f6f8fa] py-2.5 last:border-0"
                >
                  <dt className="w-20 shrink-0 text-muted">{k}</dt>
                  <dd className="min-w-0 break-all text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-[#edf0f5] px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Managed software</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Manual update, activate / deactivate, and delete — queued for the
            connector on the next sync.
          </p>
        </div>

        <SoftwareGroup
          title="WordPress core"
          empty="Core version not reported yet."
          items={coreItems}
          onAction={queueAction}
        />
        <SoftwareGroup
          title="Avonix connector"
          empty="Connector not reported yet."
          items={connectorItems}
          onAction={queueAction}
        />
        <SoftwareGroup
          title="Plugins"
          empty="No plugins yet."
          items={pluginItems}
          onAction={queueAction}
        />
        <SoftwareGroup
          title="Themes"
          empty="No themes yet."
          items={themeItems}
          onAction={queueAction}
        />
      </section>
    </div>
  );
}

function SoftwareGroup({
  title,
  empty,
  items,
  onAction,
}: {
  title: string;
  empty: string;
  items: UpdateInventoryItem[];
  onAction: (
    kind: UpdateActionKind,
    item: Pick<UpdateInventoryItem, "targetType" | "slug" | "name">,
  ) => void;
}) {
  return (
    <div className="border-b border-[#f1f4f8] last:border-0">
      <div className="bg-[#f8fafc] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-[12.5px] text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-[#f1f4f8]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 px-4 py-3.5"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {item.name}
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  <span className="font-mono">{item.version}</span>
                  {item.latestVersion ? (
                    <>
                      {" "}
                      → <span className="font-mono">{item.latestVersion}</span>
                    </>
                  ) : null}
                  {" · "}
                  {item.active ? "Active" : "Inactive"}
                  {item.updateAvailable ? " · Update available" : ""}
                </span>
              </span>
              <ItemActionsMenu item={item} onAction={onAction} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemActionsMenu({
  item,
  onAction,
}: {
  item: UpdateInventoryItem;
  onAction: (
    kind: UpdateActionKind,
    item: Pick<UpdateInventoryItem, "targetType" | "slug" | "name">,
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const actions = availableItemActions(item.targetType, item.active);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`Actions for ${item.name}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-8 place-items-center rounded-lg border border-line text-[16px] leading-none text-muted hover:bg-[#f8fafc] hover:text-ink"
      >
        ⋮
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
            {actions.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAction(kind, item);
                }}
                className={`block w-full px-3 py-2 text-left text-[13px] font-medium hover:bg-[#f8fafc] ${
                  kind === "delete" ? "text-bad" : "text-ink"
                }`}
              >
                {updateActionLabel(kind)}
              </button>
            ))}
          </div>
        </>
      ) : null}
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
      <div className={`text-2xl font-bold tracking-[-0.02em] ${tone}`}>
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
