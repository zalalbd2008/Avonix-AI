import type {
  FormIntegrationConnection,
  FormIntegrationProvider,
  FormIntegrationsConfig,
  FormSubmissionCrm,
  FormSubmissionMeta,
  FormUtmParams,
} from "@/lib/db/schema";

export const INTEGRATION_PROVIDERS: {
  id: FormIntegrationProvider;
  label: string;
  hint: string;
  needsWebhook: boolean;
  needsApiKey: boolean;
  needsListId: boolean;
}[] = [
  {
    id: "webhook",
    label: "Webhook",
    hint: "POST JSON to any HTTPS URL",
    needsWebhook: true,
    needsApiKey: false,
    needsListId: false,
  },
  {
    id: "crm",
    label: "Custom CRM",
    hint: "Your CRM ingest webhook",
    needsWebhook: true,
    needsApiKey: false,
    needsListId: false,
  },
  {
    id: "zapier",
    label: "Zapier",
    hint: "Catch Hook URL",
    needsWebhook: true,
    needsApiKey: false,
    needsListId: false,
  },
  {
    id: "make",
    label: "Make",
    hint: "Custom webhook module",
    needsWebhook: true,
    needsApiKey: false,
    needsListId: false,
  },
  {
    id: "n8n",
    label: "n8n",
    hint: "Webhook node URL",
    needsWebhook: true,
    needsApiKey: false,
    needsListId: false,
  },
  {
    id: "google_sheets",
    label: "Google Sheets",
    hint: "Apps Script web app that appends a row",
    needsWebhook: true,
    needsApiKey: false,
    needsListId: false,
  },
  {
    id: "google_drive",
    label: "Google Drive",
    hint: "Apps Script / Drive ingest webhook",
    needsWebhook: true,
    needsApiKey: false,
    needsListId: false,
  },
  {
    id: "mailchimp",
    label: "Mailchimp",
    hint: "API key + audience list id",
    needsWebhook: false,
    needsApiKey: true,
    needsListId: true,
  },
  {
    id: "brevo",
    label: "Brevo",
    hint: "API key + list id",
    needsWebhook: false,
    needsApiKey: true,
    needsListId: true,
  },
  {
    id: "hubspot",
    label: "HubSpot",
    hint: "Private app token",
    needsWebhook: false,
    needsApiKey: true,
    needsListId: false,
  },
  {
    id: "salesforce",
    label: "Salesforce",
    hint: "Access token + Lead create",
    needsWebhook: true,
    needsApiKey: true,
    needsListId: false,
  },
];

const PROVIDER_SET = new Set(INTEGRATION_PROVIDERS.map((p) => p.id));

export const DEFAULT_INTEGRATIONS: FormIntegrationsConfig = {
  enabled: true,
  connections: [],
};

export function newIntegrationId(): string {
  return `int_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeIntegrations(
  raw?: FormIntegrationsConfig | null,
): FormIntegrationsConfig {
  const connections = normalizeConnections(raw?.connections);
  return {
    enabled: raw?.enabled !== false,
    connections,
  };
}

function normalizeConnections(
  raw?: FormIntegrationConnection[] | null,
): FormIntegrationConnection[] {
  if (!Array.isArray(raw)) return [];
  const out: FormIntegrationConnection[] = [];
  for (const [i, c] of raw.entries()) {
    if (!c || !PROVIDER_SET.has(c.provider)) continue;
    const id = (c.id || `int_${i + 1}`).trim().slice(0, 40);
    const fieldMap = normalizeFieldMap(c.fieldMap);
    out.push({
      id,
      provider: c.provider,
      enabled: c.enabled !== false,
      label: (c.label || meta(c.provider).label).trim().slice(0, 80),
      webhookUrl: sanitizeHttps(c.webhookUrl),
      apiKey: (c.apiKey ?? "").trim().slice(0, 500),
      listId: (c.listId ?? "").trim().slice(0, 120),
      ...(Object.keys(fieldMap).length ? { fieldMap } : {}),
    });
    if (out.length >= 20) break;
  }
  return out;
}

function meta(provider: FormIntegrationProvider) {
  return (
    INTEGRATION_PROVIDERS.find((p) => p.id === provider) ??
    INTEGRATION_PROVIDERS[0]!
  );
}

function sanitizeHttps(raw?: string): string {
  const u = raw?.trim() ?? "";
  if (!u || !/^https:\/\//i.test(u)) return "";
  return u.slice(0, 2000);
}

function normalizeFieldMap(
  raw?: Record<string, string> | null,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim().slice(0, 80);
    const val = String(v ?? "").trim().slice(0, 120);
    if (key && val) out[key] = val;
    if (Object.keys(out).length >= 40) break;
  }
  return out;
}

export type IntegrationDispatchPayload = {
  formId: string;
  formName: string;
  websiteName?: string | null;
  pageUrl?: string | null;
  values: Record<string, unknown>;
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    message?: string | null;
  };
  crm?: FormSubmissionCrm | null;
  meta?: FormSubmissionMeta | null;
  utm?: FormUtmParams | null;
};

/** Fire all enabled connections. Never throws — failures are logged. */
export async function dispatchFormIntegrations(
  config: FormIntegrationsConfig | null | undefined,
  payload: IntegrationDispatchPayload,
): Promise<void> {
  const cfg = normalizeIntegrations(config);
  if (cfg.enabled === false) return;
  const jobs = (cfg.connections ?? [])
    .filter((c) => c.enabled !== false)
    .map((c) =>
      dispatchOne(c, payload).catch((err) =>
        console.error(`integration ${c.provider}/${c.id} failed`, err),
      ),
    );
  if (jobs.length) await Promise.allSettled(jobs);
}

async function dispatchOne(
  conn: FormIntegrationConnection,
  payload: IntegrationDispatchPayload,
): Promise<void> {
  const mapped = applyFieldMap(payload.values, conn.fieldMap);
  const body = {
    event: "form.submission",
    provider: conn.provider,
    form: {
      id: payload.formId,
      name: payload.formName,
    },
    website: payload.websiteName ?? null,
    pageUrl: payload.pageUrl ?? null,
    contact: payload.contact ?? null,
    values: mapped,
    crm: payload.crm
      ? {
          priority: payload.crm.priority,
          statusId: payload.crm.statusId,
          tags: payload.crm.tags,
          assignee: payload.crm.assignee,
        }
      : null,
    utm: payload.utm ?? payload.meta?.utm ?? null,
    meta: payload.meta ?? null,
    sentAt: new Date().toISOString(),
  };

  switch (conn.provider) {
    case "webhook":
    case "crm":
    case "zapier":
    case "make":
    case "n8n":
    case "google_sheets":
    case "google_drive":
      if (!conn.webhookUrl) return;
      await postJson(conn.webhookUrl, body);
      return;
    case "mailchimp":
      await pushMailchimp(conn, payload, mapped);
      return;
    case "brevo":
      await pushBrevo(conn, payload, mapped);
      return;
    case "hubspot":
      await pushHubspot(conn, payload, mapped);
      return;
    case "salesforce":
      await pushSalesforce(conn, payload, mapped);
      return;
  }
}

function applyFieldMap(
  values: Record<string, unknown>,
  map?: Record<string, string>,
): Record<string, unknown> {
  if (!map || !Object.keys(map).length) return values;
  const out: Record<string, unknown> = {};
  for (const [from, to] of Object.entries(map)) {
    if (from in values) out[to] = values[from];
  }
  // Keep unmapped keys too so automation tools still see everything.
  for (const [k, v] of Object.entries(values)) {
    if (!(k in map)) out[k] = v;
  }
  return out;
}

async function postJson(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

function pickEmail(
  payload: IntegrationDispatchPayload,
  mapped: Record<string, unknown>,
): string | null {
  const e =
    payload.contact?.email ||
    mapped.email ||
    mapped.Email ||
    mapped.EMAIL;
  return typeof e === "string" && e.includes("@") ? e.trim().toLowerCase() : null;
}

function pickName(
  payload: IntegrationDispatchPayload,
  mapped: Record<string, unknown>,
): string {
  const n = payload.contact?.name || mapped.name || mapped.Name || "";
  return String(n).trim().slice(0, 200);
}

async function pushMailchimp(
  conn: FormIntegrationConnection,
  payload: IntegrationDispatchPayload,
  mapped: Record<string, unknown>,
): Promise<void> {
  if (!conn.apiKey || !conn.listId) return;
  const email = pickEmail(payload, mapped);
  if (!email) return;
  const dc = conn.apiKey.split("-").pop();
  if (!dc) return;
  const name = pickName(payload, mapped);
  const [fname, ...rest] = name.split(/\s+/);
  const res = await fetch(
    `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(conn.listId)}/members`,
    {
      method: "POST",
      headers: {
        Authorization: `apikey ${conn.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        merge_fields: {
          FNAME: fname || "",
          LNAME: rest.join(" ") || "",
          PHONE: String(payload.contact?.phone || mapped.phone || ""),
        },
      }),
    },
  );
  // 400 member_exists is fine — treat as success for idempotent retries.
  if (!res.ok && res.status !== 400) throw new Error(`mailchimp ${res.status}`);
}

async function pushBrevo(
  conn: FormIntegrationConnection,
  payload: IntegrationDispatchPayload,
  mapped: Record<string, unknown>,
): Promise<void> {
  if (!conn.apiKey) return;
  const email = pickEmail(payload, mapped);
  if (!email) return;
  const name = pickName(payload, mapped);
  const listIds = conn.listId
    ? [Number(conn.listId)].filter((n) => Number.isFinite(n))
    : [];
  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": conn.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: name.split(/\s+/)[0] || "",
        LASTNAME: name.split(/\s+/).slice(1).join(" ") || "",
        SMS: String(payload.contact?.phone || mapped.phone || ""),
      },
      ...(listIds.length ? { listIds, updateEnabled: true } : { updateEnabled: true }),
    }),
  });
  if (!res.ok && res.status !== 400) throw new Error(`brevo ${res.status}`);
}

async function pushHubspot(
  conn: FormIntegrationConnection,
  payload: IntegrationDispatchPayload,
  mapped: Record<string, unknown>,
): Promise<void> {
  if (!conn.apiKey) return;
  const email = pickEmail(payload, mapped);
  if (!email) return;
  const name = pickName(payload, mapped);
  const [firstname, ...rest] = name.split(/\s+/);
  const props: Record<string, string> = {
    email,
    firstname: firstname || "",
    lastname: rest.join(" ") || "",
  };
  const phone = String(payload.contact?.phone || mapped.phone || "").trim();
  if (phone) props.phone = phone;
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: props }),
  });
  if (!res.ok && res.status !== 409) throw new Error(`hubspot ${res.status}`);
}

async function pushSalesforce(
  conn: FormIntegrationConnection,
  payload: IntegrationDispatchPayload,
  mapped: Record<string, unknown>,
): Promise<void> {
  // webhookUrl = instance base, e.g. https://yourorg.my.salesforce.com
  if (!conn.apiKey || !conn.webhookUrl) return;
  const email = pickEmail(payload, mapped);
  if (!email) return;
  const name = pickName(payload, mapped);
  const [first, ...rest] = name.split(/\s+/);
  const base = conn.webhookUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/services/data/v59.0/sobjects/Lead`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      FirstName: first || "Lead",
      LastName: rest.join(" ") || "Form",
      Email: email,
      Phone: String(payload.contact?.phone || mapped.phone || ""),
      Company: String(mapped.company || payload.formName || "Avonix form"),
      Description: String(payload.contact?.message || mapped.message || ""),
    }),
  });
  if (!res.ok) throw new Error(`salesforce ${res.status}`);
}
