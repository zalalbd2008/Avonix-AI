/**
 * Browser-safe enterprise form config helpers.
 * Portal HMAC tokens stay in `enterprise.ts` (Node crypto).
 */
import type {
  FormAuditEntry,
  FormEnterpriseConfig,
  FormField,
  FormRoiConfig,
  FormSettings,
  FormSubmissionAi,
  FormUniqueScores,
  FormVersionSnapshot,
} from "@/lib/db/schema";

export const DEFAULT_ENTERPRISE: FormEnterpriseConfig = {
  enabled: true,
  uniqueScores: true,
  conversationSummary: true,
  clientPortal: true,
  versioning: true,
  maxVersions: 12,
  auditLog: true,
  whiteLabel: { enabled: false, hideAvonix: false },
  i18n: { enabled: false, defaultLocale: "en", locales: ["en"] },
  roles: { requireAdminToPublish: false, editorEmails: [] },
  versions: [],
  audit: [],
};

export const DEFAULT_ROI: FormRoiConfig = {
  currency: "USD",
  defaultInvestment: 5000,
  defaultMonths: 6,
  returnMultiple: 2.5,
  labelInvestment: "Investment",
  labelMonths: "Timeline (months)",
  labelReturn: "Projected return",
};

export function normalizeEnterprise(
  raw?: FormEnterpriseConfig | null,
): FormEnterpriseConfig {
  const maxVersions = clampInt(raw?.maxVersions ?? DEFAULT_ENTERPRISE.maxVersions, 3, 30);
  const locales = (raw?.i18n?.locales ?? DEFAULT_ENTERPRISE.i18n?.locales ?? ["en"])
    .map((l) => l.trim().toLowerCase().slice(0, 12))
    .filter(Boolean)
    .slice(0, 12);
  return {
    enabled: raw?.enabled !== false,
    uniqueScores: raw?.uniqueScores !== false,
    conversationSummary: raw?.conversationSummary !== false,
    clientPortal: raw?.clientPortal !== false,
    versioning: raw?.versioning !== false,
    maxVersions,
    auditLog: raw?.auditLog !== false,
    whiteLabel: {
      enabled: Boolean(raw?.whiteLabel?.enabled),
      brandName: raw?.whiteLabel?.brandName?.trim().slice(0, 80) || undefined,
      logoUrl: raw?.whiteLabel?.logoUrl?.trim().slice(0, 500) || undefined,
      hideAvonix: Boolean(raw?.whiteLabel?.hideAvonix),
    },
    i18n: {
      enabled: Boolean(raw?.i18n?.enabled),
      defaultLocale: (raw?.i18n?.defaultLocale?.trim().toLowerCase() || "en").slice(0, 12),
      locales: locales.length ? locales : ["en"],
    },
    roles: {
      requireAdminToPublish: Boolean(raw?.roles?.requireAdminToPublish),
      editorEmails: (raw?.roles?.editorEmails ?? [])
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"))
        .slice(0, 40),
    },
    versions: normalizeVersions(raw?.versions, maxVersions),
    audit: normalizeAudit(raw?.audit),
  };
}

export function publicEnterpriseForEmbed(cfg: FormEnterpriseConfig): {
  enabled: boolean;
  clientPortal: boolean;
  whiteLabel: {
    enabled: boolean;
    brandName?: string;
    logoUrl?: string;
    hideAvonix: boolean;
  };
  i18n: { enabled: boolean; defaultLocale: string; locales: string[] };
} {
  const n = normalizeEnterprise(cfg);
  return {
    enabled: n.enabled !== false,
    clientPortal: Boolean(n.clientPortal),
    whiteLabel: {
      enabled: Boolean(n.whiteLabel?.enabled),
      ...(n.whiteLabel?.brandName ? { brandName: n.whiteLabel.brandName } : {}),
      ...(n.whiteLabel?.logoUrl ? { logoUrl: n.whiteLabel.logoUrl } : {}),
      hideAvonix: Boolean(n.whiteLabel?.hideAvonix),
    },
    i18n: {
      enabled: Boolean(n.i18n?.enabled),
      defaultLocale: n.i18n?.defaultLocale || "en",
      locales: n.i18n?.locales?.length ? n.i18n.locales : ["en"],
    },
  };
}

export function resolveRoiConfig(raw?: FormRoiConfig | null): FormRoiConfig {
  return {
    currency: (raw?.currency?.trim() || DEFAULT_ROI.currency || "USD").slice(0, 8),
    defaultInvestment: clampMoney(raw?.defaultInvestment ?? DEFAULT_ROI.defaultInvestment ?? 0),
    defaultMonths: clampInt(raw?.defaultMonths ?? DEFAULT_ROI.defaultMonths ?? 6, 1, 60),
    returnMultiple: clampFloat(raw?.returnMultiple ?? DEFAULT_ROI.returnMultiple ?? 2.5, 0.1, 20),
    labelInvestment: (raw?.labelInvestment?.trim() || DEFAULT_ROI.labelInvestment || "Investment").slice(0, 60),
    labelMonths: (raw?.labelMonths?.trim() || DEFAULT_ROI.labelMonths || "Timeline (months)").slice(0, 60),
    labelReturn: (raw?.labelReturn?.trim() || DEFAULT_ROI.labelReturn || "Projected return").slice(0, 60),
  };
}

export type ScoreInput = {
  values: Record<string, unknown>;
  contact?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    message?: string | null;
  };
  ai?: FormSubmissionAi | null;
};

/** Heuristic unique scores for agency lead qualification. */
export function computeUniqueScores(
  config: FormEnterpriseConfig | null | undefined,
  input: ScoreInput,
): FormUniqueScores {
  const cfg = normalizeEnterprise(config);
  if (cfg.enabled === false || cfg.uniqueScores === false) return {};

  const message = pickMessage(input);
  const lower = message.toLowerCase();
  const values = input.values;
  const aiScore = input.ai?.score;
  const spam = Boolean(input.ai?.spam);

  let health = 45;
  let complexity = 30;
  let sales = 40;
  let readiness = 35;

  if (input.contact?.email || values.email) health += 8;
  if (input.contact?.phone || values.phone || values.whatsapp) health += 8;
  if (input.contact?.name || values.name) health += 4;
  if (message.length > 80) health += 8;
  if (message.length > 200) health += 6;
  if (values.budget || values.budget_range || values.monthly_revenue) health += 10;
  if (values.timeline || values.project_priority) health += 6;
  if (values.company || values.business_size) health += 5;
  if (aiScore != null) health = Math.round(health * 0.55 + aiScore * 0.45);
  if (spam) health = Math.min(health, 18);

  if (/\b(redesign|migration|rebuild|enterprise|multi[- ]?site|app|saas)\b/i.test(message)) {
    complexity += 25;
  }
  if (values.project_type || values.features || values.competitors) complexity += 12;
  if (Array.isArray(values.services) && values.services.length > 2) complexity += 10;
  if (values.existing_website === "yes" || values.existing_website === true) complexity += 6;
  complexity = Math.min(100, complexity + Math.floor(message.length / 80));

  if (/\b(quote|proposal|hire|ready|budget approved|decision)\b/i.test(lower)) sales += 18;
  if (values.decision_maker === "yes" || values.decision_maker === true) sales += 14;
  if (values.budget || values.budget_range) sales += 12;
  if (values.timeline && /asap|urgent|this month|1[- ]?month/i.test(String(values.timeline))) {
    sales += 10;
  }
  if (spam) sales = Math.min(sales, 15);
  if (aiScore != null && aiScore >= 70) sales += 8;

  if (values.company && (values.email || input.contact?.email)) readiness += 10;
  if (values.preferred_contact || values.whatsapp || values.phone) readiness += 8;
  if (values.referral_source || values.how_heard) readiness += 6;
  if (values.documents || values.brand_assets) readiness += 8;
  if (message.length > 120) readiness += 8;
  if (spam) readiness = Math.min(readiness, 20);

  health = clampScore(health);
  complexity = clampScore(complexity);
  sales = clampScore(sales);
  readiness = clampScore(readiness);

  const budgetRecommendation = recommendBudget(values, complexity, message);
  const estimatedDeliveryDays = estimateDelivery(complexity, values);
  const summary =
    cfg.conversationSummary !== false ? summariseMessage(message, input.ai?.category) : undefined;

  const roi = parseRoiValue(values.roi ?? values.roi_calculator);
  const out: FormUniqueScores = {
    leadHealth: health,
    complexity,
    salesProbability: sales,
    clientReadiness: readiness,
    ...(budgetRecommendation ? { budgetRecommendation } : {}),
    ...(estimatedDeliveryDays ? { estimatedDeliveryDays } : {}),
    ...(summary ? { summary } : {}),
  };

  if (roi) {
    out.roiPercent = roi.percent;
    out.roiLabel = roi.label;
  }

  return out;
}

export function appendAuditEntry(
  cfg: FormEnterpriseConfig,
  entry: Omit<FormAuditEntry, "at"> & { at?: string },
): FormEnterpriseConfig {
  const n = normalizeEnterprise(cfg);
  if (n.auditLog === false) return n;
  const next: FormAuditEntry = {
    at: entry.at || new Date().toISOString(),
    action: entry.action.slice(0, 60),
    ...(entry.actor ? { actor: entry.actor.slice(0, 120) } : {}),
    ...(entry.detail ? { detail: entry.detail.slice(0, 240) } : {}),
  };
  return {
    ...n,
    audit: [next, ...(n.audit ?? [])].slice(0, 50),
  };
}

/** Push a version snapshot before overwriting the live form. */
export function pushVersionSnapshot(
  cfg: FormEnterpriseConfig,
  snapshot: {
    fields: FormField[];
    settings: FormSettings;
    label?: string;
  },
): FormEnterpriseConfig {
  const n = normalizeEnterprise(cfg);
  if (n.versioning === false) return n;

  const stripped = stripHeavyEnterprise(snapshot.settings);
  const payload = JSON.stringify({
    fields: snapshot.fields,
    settings: stripped,
  }).slice(0, 400_000);

  const row: FormVersionSnapshot = {
    id: `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    fieldCount: snapshot.fields.length,
    payload,
    ...(snapshot.label ? { label: snapshot.label.slice(0, 80) } : {}),
  };

  return {
    ...n,
    versions: [row, ...(n.versions ?? [])].slice(0, n.maxVersions ?? 12),
  };
}

export function parseVersionPayload(
  payload: string,
): { fields: FormField[]; settings: FormSettings } | null {
  try {
    const data = JSON.parse(payload) as {
      fields?: FormField[];
      settings?: FormSettings;
    };
    if (!Array.isArray(data.fields) || !data.settings) return null;
    return { fields: data.fields, settings: data.settings };
  } catch {
    return null;
  }
}

export type FormExportBundle = {
  version: 1;
  exportedAt: string;
  name: string;
  submitLabel?: string;
  successMessage?: string;
  fields: FormField[];
  settings: FormSettings;
};

export function buildExportBundle(opts: {
  name: string;
  fields: FormField[];
  settings: FormSettings;
  submitLabel?: string;
  successMessage?: string;
}): FormExportBundle {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    name: opts.name.slice(0, 120),
    submitLabel: opts.submitLabel,
    successMessage: opts.successMessage,
    fields: opts.fields,
    settings: stripHeavyEnterprise(opts.settings),
  };
}

export function parseImportBundle(
  raw: unknown,
): { ok: true; bundle: FormExportBundle } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid JSON." };
  }
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.fields) || !o.settings || typeof o.settings !== "object") {
    return { ok: false, error: "Bundle needs fields and settings." };
  }
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Imported form";
  return {
    ok: true,
    bundle: {
      version: 1,
      exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : new Date().toISOString(),
      name: name.slice(0, 120),
      submitLabel: typeof o.submitLabel === "string" ? o.submitLabel : undefined,
      successMessage: typeof o.successMessage === "string" ? o.successMessage : undefined,
      fields: o.fields as FormField[],
      settings: stripHeavyEnterprise(o.settings as FormSettings),
    },
  };
}

function stripHeavyEnterprise(settings: FormSettings): FormSettings {
  const enterprise = settings.enterprise
    ? {
        ...settings.enterprise,
        versions: [],
        audit: [],
      }
    : undefined;
  return { ...settings, ...(enterprise ? { enterprise } : {}) };
}

function normalizeVersions(
  raw: FormVersionSnapshot[] | undefined,
  max: number,
): FormVersionSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v && typeof v.id === "string" && typeof v.payload === "string")
    .map((v) => ({
      id: v.id.slice(0, 40),
      at: v.at?.slice(0, 40) || new Date().toISOString(),
      fieldCount: clampInt(v.fieldCount ?? 0, 0, 500),
      payload: v.payload.slice(0, 400_000),
      ...(v.label?.trim() ? { label: v.label.trim().slice(0, 80) } : {}),
    }))
    .slice(0, max);
}

function normalizeAudit(raw: FormAuditEntry[] | undefined): FormAuditEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e.action === "string")
    .map((e) => ({
      at: e.at?.slice(0, 40) || new Date().toISOString(),
      action: e.action.slice(0, 60),
      ...(e.actor ? { actor: e.actor.slice(0, 120) } : {}),
      ...(e.detail ? { detail: e.detail.slice(0, 240) } : {}),
    }))
    .slice(0, 50);
}

function pickMessage(input: ScoreInput): string {
  if (input.contact?.message?.trim()) return input.contact.message.trim();
  for (const k of ["message", "Message", "details", "notes", "description", "project_notes"]) {
    const v = input.values[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return Object.values(input.values)
    .filter((v) => typeof v === "string" && String(v).length > 40)
    .map(String)
    .join("\n")
    .slice(0, 4000);
}

function summariseMessage(message: string, category?: string): string | undefined {
  const clean = message.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  const head = clean.slice(0, 220);
  const prefix = category ? `${category}: ` : "";
  return `${prefix}${head}${clean.length > 220 ? "…" : ""}`;
}

function recommendBudget(
  values: Record<string, unknown>,
  complexity: number,
  message: string,
): string | undefined {
  const existing =
    values.budget ||
    values.budget_range ||
    values.monthly_revenue;
  if (typeof existing === "string" && existing.trim()) {
    return `Align proposal near stated budget (${existing.trim().slice(0, 80)}).`;
  }
  if (complexity >= 75 || /\benterprise|multi[- ]?site|custom app\b/i.test(message)) {
    return "Recommend a discovery workshop + phased build ($8k–$25k+ depending on scope).";
  }
  if (complexity >= 50) {
    return "Recommend a mid-tier package ($3k–$8k) with clear milestone billing.";
  }
  return "Recommend a starter / launch package ($1k–$3k) with optional add-ons.";
}

function estimateDelivery(
  complexity: number,
  values: Record<string, unknown>,
): number | undefined {
  const timeline = String(values.timeline ?? values.project_priority ?? "").toLowerCase();
  if (/asap|urgent|1[- ]?week/.test(timeline)) return Math.max(7, Math.round(complexity / 4));
  if (/1[- ]?month|30 days/.test(timeline)) return 30;
  if (complexity >= 75) return 90;
  if (complexity >= 50) return 45;
  return 21;
}

function parseRoiValue(
  raw: unknown,
): { percent: number; label: string } | null {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string" && raw.trim().startsWith("{")) {
    try {
      obj = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (raw && typeof raw === "object") {
    obj = raw as Record<string, unknown>;
  }
  if (!obj) return null;
  const investment = Number(obj.investment);
  const projected = Number(obj.projected ?? obj.return);
  if (!Number.isFinite(investment) || investment <= 0 || !Number.isFinite(projected)) {
    return null;
  }
  const percent = Math.round(((projected - investment) / investment) * 100);
  const months = Number(obj.months);
  const label =
    Number.isFinite(months) && months > 0
      ? `${percent}% over ${months} mo`
      : `${percent}% projected ROI`;
  return { percent, label };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampInt(n: number | undefined, min: number, max: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : min;
  return Math.max(min, Math.min(max, v));
}

function clampFloat(n: number | undefined, min: number, max: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : min;
  return Math.max(min, Math.min(max, Math.round(v * 100) / 100));
}

function clampMoney(n: number | undefined): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(10_000_000, Math.max(0, Math.round(n * 100) / 100));
}
