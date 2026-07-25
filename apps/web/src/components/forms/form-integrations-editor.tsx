"use client";

import type {
  FormIntegrationConnection,
  FormIntegrationProvider,
  FormIntegrationsConfig,
} from "@/lib/db/schema";
import {
  DEFAULT_INTEGRATIONS,
  INTEGRATION_PROVIDERS,
  newIntegrationId,
  normalizeIntegrations,
} from "@/lib/forms/integrations";

/**
 * Post-submit integrations — webhooks, Zapier/Make/n8n, Sheets, ESP, CRM APIs.
 */
export function FormIntegrationsEditor({
  value,
  onChange,
}: {
  value: FormIntegrationsConfig;
  onChange: (next: FormIntegrationsConfig) => void;
}) {
  const integrations = normalizeIntegrations(value);
  const connections = integrations.connections ?? [];

  function patch(partial: Partial<FormIntegrationsConfig>) {
    onChange(normalizeIntegrations({ ...integrations, ...partial }));
  }

  function updateConn(id: string, partial: Partial<FormIntegrationConnection>) {
    patch({
      connections: connections.map((c) =>
        c.id === id ? { ...c, ...partial } : c,
      ),
    });
  }

  function addConnection(provider: FormIntegrationProvider) {
    const meta = INTEGRATION_PROVIDERS.find((p) => p.id === provider)!;
    patch({
      connections: [
        ...connections,
        {
          id: newIntegrationId(),
          provider,
          enabled: true,
          label: meta.label,
          webhookUrl: "",
          apiKey: "",
          listId: "",
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Integrations
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Fire webhooks and sync leads to Zapier, Make, n8n, Sheets, Mailchimp,
        Brevo, HubSpot, Salesforce, and custom CRM endpoints after each submit.
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={integrations.enabled !== false}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Enable integrations
      </label>

      {integrations.enabled !== false ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {INTEGRATION_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addConnection(p.id)}
                className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand"
                title={p.hint}
              >
                + {p.label}
              </button>
            ))}
          </div>

          {connections.length === 0 ? (
            <p className="text-[12px] text-faint">
              No connections yet — add Zapier, a webhook, or an ESP above.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {connections.map((c) => (
                <ConnectionCard
                  key={c.id}
                  connection={c}
                  onChange={(partial) => updateConn(c.id, partial)}
                  onRemove={() =>
                    patch({
                      connections: connections.filter((x) => x.id !== c.id),
                    })
                  }
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      <button
        type="button"
        onClick={() => onChange(normalizeIntegrations(DEFAULT_INTEGRATIONS))}
        className="self-start text-[11.5px] font-semibold text-muted hover:text-brand"
      >
        Clear all integrations
      </button>
    </div>
  );
}

function ConnectionCard({
  connection,
  onChange,
  onRemove,
}: {
  connection: FormIntegrationConnection;
  onChange: (partial: Partial<FormIntegrationConnection>) => void;
  onRemove: () => void;
}) {
  const meta =
    INTEGRATION_PROVIDERS.find((p) => p.id === connection.provider) ??
    INTEGRATION_PROVIDERS[0]!;

  return (
    <div className="rounded-lg border border-[#e6e9f0] bg-white p-2.5">
      <div className="mb-2 flex items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] font-semibold text-[#1a2332]">
          <input
            type="checkbox"
            checked={connection.enabled !== false}
            onChange={(e) => onChange({ enabled: e.target.checked })}
          />
          <span className="truncate">{connection.label || meta.label}</span>
        </label>
        <span className="rounded-full bg-[#f1f4f8] px-2 py-0.5 text-[10.5px] font-semibold text-muted">
          {meta.label}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-[11.5px] font-semibold text-muted hover:text-bad"
        >
          ×
        </button>
      </div>
      <p className="mb-2 text-[11px] text-faint">{meta.hint}</p>
      <label className="mb-1.5 block">
        <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
          Label
        </span>
        <input
          value={connection.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          className="w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
        />
      </label>
      {meta.needsWebhook ? (
        <label className="mb-1.5 block">
          <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
            {connection.provider === "salesforce"
              ? "Instance URL"
              : "Webhook URL (https)"}
          </span>
          <input
            value={connection.webhookUrl ?? ""}
            onChange={(e) => onChange({ webhookUrl: e.target.value })}
            placeholder="https://…"
            className="w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5 font-mono text-[11.5px] outline-none focus:border-brand"
          />
        </label>
      ) : null}
      {meta.needsApiKey ? (
        <label className="mb-1.5 block">
          <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
            API key / token
          </span>
          <input
            type="password"
            value={connection.apiKey ?? ""}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            className="w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5 font-mono text-[11.5px] outline-none focus:border-brand"
          />
        </label>
      ) : null}
      {meta.needsListId ? (
        <label className="mb-1.5 block">
          <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
            List / audience ID
          </span>
          <input
            value={connection.listId ?? ""}
            onChange={(e) => onChange({ listId: e.target.value })}
            className="w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5 font-mono text-[11.5px] outline-none focus:border-brand"
          />
        </label>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
          Field map (optional)
        </span>
        <input
          value={serializeFieldMap(connection.fieldMap)}
          onChange={(e) => onChange({ fieldMap: parseFieldMap(e.target.value) })}
          placeholder="email=Email, name=Full Name"
          className="w-full rounded-lg border border-[#dbe1ea] px-2 py-1.5 font-mono text-[11.5px] outline-none focus:border-brand"
        />
      </label>
    </div>
  );
}

function serializeFieldMap(map?: Record<string, string>): string {
  if (!map) return "";
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

function parseFieldMap(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return out;
}
