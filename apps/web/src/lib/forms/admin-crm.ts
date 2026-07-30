import type {
  FormAdminCrmConfig,
  FormCrmStatusOption,
  FormCrmTimelineEvent,
  FormLeadPriority,
  FormSubmissionCrm,
} from "@/lib/db/schema";

export const LEAD_PRIORITIES: {
  id: FormLeadPriority;
  label: string;
}[] = [
  { id: "low", label: "Low" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
];

export const DEFAULT_CRM_STATUSES: FormCrmStatusOption[] = [
  { id: "new", label: "New", color: "#0ea5e9" },
  { id: "contacted", label: "Contacted", color: "#8b5cf6" },
  { id: "qualified", label: "Qualified", color: "#f59e0b" },
  { id: "won", label: "Won", color: "#059669" },
  { id: "lost", label: "Lost", color: "#94a3b8" },
];

export const DEFAULT_ADMIN_CRM: FormAdminCrmConfig = {
  enabled: true,
  defaultPriority: "normal",
  defaultStatusId: "new",
  statuses: DEFAULT_CRM_STATUSES,
  tagPresets: ["hot", "follow-up", "proposal", "spam"],
  defaultAssignee: "",
  notifications: {
    emails: [],
    teamsWebhookUrl: "",
    webhookUrl: "",
  },
};

const PRIORITY_SET = new Set<FormLeadPriority>([
  "low",
  "normal",
  "high",
  "urgent",
]);

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeAdminCrm(
  raw?: FormAdminCrmConfig | null,
): FormAdminCrmConfig {
  const statuses = normalizeStatuses(raw?.statuses);
  const defaultStatusId =
    statuses.find((s) => s.id === raw?.defaultStatusId)?.id ??
    statuses[0]?.id ??
    "new";
  const priority = PRIORITY_SET.has(raw?.defaultPriority as FormLeadPriority)
    ? (raw!.defaultPriority as FormLeadPriority)
    : "normal";
  const tagPresets = (raw?.tagPresets ?? DEFAULT_ADMIN_CRM.tagPresets ?? [])
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 24);
  const emails = (raw?.notifications?.emails ?? [])
    .map((e) => e.trim().toLowerCase().slice(0, 320))
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .slice(0, 8);

  return {
    enabled: raw?.enabled !== false,
    defaultPriority: priority,
    defaultStatusId,
    statuses,
    tagPresets,
    defaultAssignee: (raw?.defaultAssignee ?? "").trim().slice(0, 160),
    notifications: {
      emails,
      teamsWebhookUrl: sanitizeUrl(raw?.notifications?.teamsWebhookUrl),
      webhookUrl: sanitizeUrl(raw?.notifications?.webhookUrl),
    },
  };
}

function sanitizeUrl(raw?: string): string {
  const u = raw?.trim() ?? "";
  if (!u) return "";
  if (!/^https:\/\//i.test(u)) return "";
  return u.slice(0, 2000);
}

function normalizeStatuses(
  raw?: FormCrmStatusOption[] | null,
): FormCrmStatusOption[] {
  const list = Array.isArray(raw) && raw.length ? raw : DEFAULT_CRM_STATUSES;
  const out: FormCrmStatusOption[] = [];
  const seen = new Set<string>();
  for (const [i, s] of list.entries()) {
    const id = (s.id || `status_${i + 1}`).trim().slice(0, 40) || `status_${i + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label: (s.label || id).trim().slice(0, 60) || id,
      ...(s.color?.trim() ? { color: s.color.trim().slice(0, 32) } : {}),
    });
    if (out.length >= 12) break;
  }
  return out.length ? out : DEFAULT_CRM_STATUSES;
}

export function normalizeSubmissionCrm(
  raw?: FormSubmissionCrm | null,
  admin?: FormAdminCrmConfig | null,
): FormSubmissionCrm {
  const cfg = normalizeAdminCrm(admin);
  const statusIds = new Set(cfg.statuses!.map((s) => s.id));
  const priority = PRIORITY_SET.has(raw?.priority as FormLeadPriority)
    ? (raw!.priority as FormLeadPriority)
    : cfg.defaultPriority;
  const statusId =
    raw?.statusId && statusIds.has(raw.statusId)
      ? raw.statusId
      : cfg.defaultStatusId;
  const tags = (raw?.tags ?? [])
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 20);
  const timeline = normalizeTimeline(raw?.timeline);

  return {
    priority,
    statusId,
    tags,
    assignee: (raw?.assignee ?? cfg.defaultAssignee ?? "").trim().slice(0, 160),
    notes: (raw?.notes ?? "").trim().slice(0, 8000),
    timeline,
  };
}

function normalizeTimeline(
  raw?: FormCrmTimelineEvent[] | null,
): FormCrmTimelineEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-80)
    .map((e, i) => ({
      id: (e.id || `ev_${i}`).slice(0, 40),
      at: e.at || new Date().toISOString(),
      type: ([
        "created",
        "status",
        "priority",
        "note",
        "tag",
        "assign",
        "notify",
      ].includes(e.type)
        ? e.type
        : "note") as FormCrmTimelineEvent["type"],
      message: (e.message || "").trim().slice(0, 500),
      ...(e.actor?.trim()
        ? { actor: e.actor.trim().slice(0, 160) }
        : {}),
    }))
    .filter((e) => e.message);
}

/** Initial CRM state when a submission arrives. */
export function initialSubmissionCrm(
  admin?: FormAdminCrmConfig | null,
): FormSubmissionCrm {
  const cfg = normalizeAdminCrm(admin);
  const status =
    cfg.statuses!.find((s) => s.id === cfg.defaultStatusId) ??
    cfg.statuses![0]!;
  return {
    priority: cfg.defaultPriority,
    statusId: status.id,
    tags: [],
    assignee: cfg.defaultAssignee || "",
    notes: "",
    timeline: [
      {
        id: newId("ev"),
        at: new Date().toISOString(),
        type: "created",
        message: `Lead created · ${status.label} · ${cfg.defaultPriority}`,
      },
    ],
  };
}

export function appendTimeline(
  crm: FormSubmissionCrm,
  event: Omit<FormCrmTimelineEvent, "id" | "at"> & {
    id?: string;
    at?: string;
  },
): FormSubmissionCrm {
  const next: FormCrmTimelineEvent = {
    id: event.id || newId("ev"),
    at: event.at || new Date().toISOString(),
    type: event.type,
    message: event.message.slice(0, 500),
    ...(event.actor ? { actor: event.actor.slice(0, 160) } : {}),
  };
  return {
    ...crm,
    timeline: [...(crm.timeline ?? []), next].slice(-80),
  };
}

export function statusLabel(
  admin: FormAdminCrmConfig,
  statusId?: string,
): string {
  return (
    admin.statuses?.find((s) => s.id === statusId)?.label ??
    statusId ??
    "—"
  );
}

export function priorityLabel(priority?: FormLeadPriority): string {
  return LEAD_PRIORITIES.find((p) => p.id === priority)?.label ?? "Normal";
}

/** Extra notification targets from admin config (beyond primary email). */
export function adminNotifyTargets(admin: FormAdminCrmConfig): {
  emails: string[];
  teamsWebhookUrl?: string;
  webhookUrl?: string;
} {
  const n = admin.notifications ?? {};
  return {
    emails: n.emails ?? [],
    ...(n.teamsWebhookUrl ? { teamsWebhookUrl: n.teamsWebhookUrl } : {}),
    ...(n.webhookUrl ? { webhookUrl: n.webhookUrl } : {}),
  };
}

export async function fireCrmWebhooks(opts: {
  admin: FormAdminCrmConfig;
  formName: string;
  websiteName?: string | null;
  pageUrl?: string | null;
  values: Record<string, unknown>;
  crm: FormSubmissionCrm;
}): Promise<void> {
  const targets = adminNotifyTargets(opts.admin);
  const text = `New lead — ${opts.formName}${opts.websiteName ? ` · ${opts.websiteName}` : ""}`;
  const payload = {
    event: "form.submission",
    form: opts.formName,
    website: opts.websiteName ?? null,
    pageUrl: opts.pageUrl ?? null,
    values: opts.values,
    crm: {
      priority: opts.crm.priority,
      statusId: opts.crm.statusId,
      assignee: opts.crm.assignee,
      tags: opts.crm.tags,
    },
    text,
  };

  const jobs: Promise<unknown>[] = [];

  if (targets.teamsWebhookUrl) {
    jobs.push(
      fetch(targets.teamsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${text}\nPriority: ${opts.crm.priority}\n${summarizeValues(opts.values)}`,
        }),
      }).catch((err) => console.error("teams webhook failed", err)),
    );
  }

  if (targets.webhookUrl) {
    jobs.push(
      fetch(targets.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => console.error("crm webhook failed", err)),
    );
  }

  if (jobs.length) await Promise.allSettled(jobs);
}

function summarizeValues(values: Record<string, unknown>): string {
  return Object.entries(values)
    .slice(0, 8)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 80)}`)
    .join("\n");
}
