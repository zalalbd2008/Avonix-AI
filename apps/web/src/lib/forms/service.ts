import { and, eq, isNull, max } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { clients, forms, websites, type FormField, type FormSettings } from "@/lib/db/schema";
import {
  DEFAULT_SETTINGS,
  INPUT_TYPES,
  KEY_RE,
  MAX_FIELDS,
  MAX_STEPS,
  mergeAppearance,
} from "./fields";
import { normalizeFormLayout } from "./layout";
import { resolveFileConfig } from "./file-config";
import { resolveAppointmentConfig } from "./appointment-config";
import {
  normalizeOptionItem,
  resolveChoiceConfig,
} from "./choice-config";
import { normalizeCaption } from "./field-caption";
import {
  normalizeContainer,
  normalizeRows,
  normalizeSectionConfig,
} from "./structure";
import { normalizeFieldWidth, type FieldWidthValue } from "./field-width";
import { normalizeCondition, normalizeLogic } from "./smart-logic";
import { normalizeSubmissionUx } from "./submission-ux";
import { normalizeUx } from "./ux-config";
import { normalizeTrust } from "./trust";
import { normalizeAdminCrm } from "./admin-crm";
import { normalizeAnalytics } from "./analytics";
import { normalizeSecurity } from "./security-config";
import { normalizeIntegrations } from "./integrations";
import { normalizeAi } from "./ai";
import {
  appendAuditEntry,
  normalizeEnterprise,
  pushVersionSnapshot,
  resolveRoiConfig,
} from "./enterprise";
import type { CreateFormInput, UpdateFormInput, FormIdInput } from "./types";

export type { CreateFormInput, UpdateFormInput, FormIdInput };

export type FormMutationResult =
  | { ok: true; formId: string }
  | { ok: false; error: string };

export type CreateFormResult = FormMutationResult;

type AgencyTx = Parameters<Parameters<typeof withAgency>[1]>[0];

/** Next shortcode number for this website (or client when unscoped). Never reused. */
async function nextFormNumber(
  tx: AgencyTx,
  opts: { websiteId: string | null; clientId: string },
): Promise<number> {
  if (opts.websiteId) {
    const [row] = await tx
      .select({ m: max(forms.formNumber) })
      .from(forms)
      .where(eq(forms.websiteId, opts.websiteId));
    return (row?.m ?? 0) + 1;
  }
  const [row] = await tx
    .select({ m: max(forms.formNumber) })
    .from(forms)
    .where(and(eq(forms.clientId, opts.clientId), isNull(forms.websiteId)));
  return (row?.m ?? 0) + 1;
}

/**
 * Create a form for a client — multi-step + conditional fields supported.
 */
export async function createFormForClient(
  agencyId: string,
  input: CreateFormInput,
): Promise<FormMutationResult> {
  const validated = validateFormInput(input);
  if (!validated.ok) return validated;

  const { name, settings, fields } = validated.data;

  return withAgency(agencyId, async (tx) => {
    const [client] = await tx
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1);
    if (!client) return { ok: false as const, error: "That client does not exist." };

    let websiteId: string | null = null;
    if (input.websiteId) {
      const [site] = await tx
        .select({ id: websites.id })
        .from(websites)
        .where(and(eq(websites.id, input.websiteId), eq(websites.clientId, input.clientId)))
        .limit(1);
      if (!site) return { ok: false as const, error: "That website is not on this client." };
      websiteId = site.id;
    }

    const formNumber = await nextFormNumber(tx, {
      websiteId,
      clientId: input.clientId,
    });

    const [created] = await tx
      .insert(forms)
      .values({
        agencyId,
        clientId: input.clientId,
        websiteId,
        formNumber,
        name,
        fields,
        settings,
        submitLabel: input.submitLabel?.trim() || "Send",
        successMessage: input.successMessage?.trim() || "Thanks — we'll be in touch.",
        isPublished: true,
      })
      .returning({ id: forms.id });

    if (!created?.id) {
      return { ok: false as const, error: "Insert succeeded but no form id returned (check RLS)." };
    }

    return { ok: true as const, formId: created.id };
  });
}

/**
 * Update an existing form (fields, steps, appearance, labels).
 */
export async function updateFormForClient(
  agencyId: string,
  input: UpdateFormInput,
  opts?: { actorEmail?: string },
): Promise<FormMutationResult> {
  const validated = validateFormInput(input);
  if (!validated.ok) return validated;

  let { name, settings, fields } = validated.data;

  return withAgency(agencyId, async (tx) => {
    const [existing] = await tx
      .select({
        id: forms.id,
        clientId: forms.clientId,
        websiteId: forms.websiteId,
        fields: forms.fields,
        settings: forms.settings,
      })
      .from(forms)
      .where(and(eq(forms.id, input.formId), eq(forms.clientId, input.clientId)))
      .limit(1);

    if (!existing) return { ok: false as const, error: "Form not found." };

    let enterprise = normalizeEnterprise(settings.enterprise);
    if (enterprise.versioning !== false) {
      enterprise = pushVersionSnapshot(enterprise, {
        fields: existing.fields,
        settings: existing.settings,
        label: "Autosave",
      });
    }
    if (enterprise.auditLog !== false) {
      enterprise = appendAuditEntry(enterprise, {
        action: "form.updated",
        actor: opts?.actorEmail,
        detail: `${fields.length} fields`,
      });
    }
    settings = { ...settings, enterprise };

    const updated = await tx
      .update(forms)
      .set({
        name,
        fields,
        settings,
        submitLabel: input.submitLabel?.trim() || "Send",
        successMessage: input.successMessage?.trim() || "Thanks — we'll be in touch.",
        updatedAt: new Date(),
      })
      .where(eq(forms.id, existing.id))
      .returning({ id: forms.id });

    if (!updated[0]?.id) {
      return { ok: false as const, error: "Update did not apply (check permissions)." };
    }

    return { ok: true as const, formId: existing.id };
  });
}

/**
 * Soft-delete a form. Submissions stay for history; the form disappears from lists.
 */
export async function deleteFormForClient(
  agencyId: string,
  input: FormIdInput,
): Promise<FormMutationResult> {
  return withAgency(agencyId, async (tx) => {
    const [existing] = await tx
      .select({ id: forms.id })
      .from(forms)
      .where(
        and(
          eq(forms.id, input.formId),
          eq(forms.clientId, input.clientId),
          isNull(forms.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) return { ok: false as const, error: "Form not found." };

    await tx
      .update(forms)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(forms.id, existing.id));

    return { ok: true as const, formId: existing.id };
  });
}

/**
 * Clone a form (fields, settings, labels) under a new name.
 */
export async function duplicateFormForClient(
  agencyId: string,
  input: FormIdInput,
): Promise<FormMutationResult> {
  return withAgency(agencyId, async (tx) => {
    const [existing] = await tx
      .select({
        id: forms.id,
        name: forms.name,
        fields: forms.fields,
        settings: forms.settings,
        submitLabel: forms.submitLabel,
        successMessage: forms.successMessage,
        websiteId: forms.websiteId,
        clientId: forms.clientId,
      })
      .from(forms)
      .where(
        and(
          eq(forms.id, input.formId),
          eq(forms.clientId, input.clientId),
          isNull(forms.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) return { ok: false as const, error: "Form not found." };

    const copyName = `${existing.name} (copy)`.slice(0, 120);
    const formNumber = await nextFormNumber(tx, {
      websiteId: existing.websiteId,
      clientId: existing.clientId,
    });
    const [created] = await tx
      .insert(forms)
      .values({
        agencyId,
        clientId: existing.clientId,
        websiteId: existing.websiteId,
        formNumber,
        name: copyName,
        fields: existing.fields,
        settings: existing.settings,
        submitLabel: existing.submitLabel,
        successMessage: existing.successMessage,
        isPublished: true,
      })
      .returning({ id: forms.id });

    if (!created?.id) {
      return { ok: false as const, error: "Could not duplicate the form." };
    }

    return { ok: true as const, formId: created.id };
  });
}

type Validated = {
  name: string;
  settings: FormSettings;
  fields: FormField[];
};

function validateFormInput(
  input: CreateFormInput,
): { ok: true; data: Validated } | { ok: false; error: string } {
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Give the form a name." };
  if (name.length > 120) return { ok: false, error: "That name is too long." };

  if (input.settings?.notificationEmail?.trim()) {
    const notify = input.settings.notificationEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notify)) {
      return { ok: false, error: "Notification email is not valid." };
    }
  }

  const settings = normalizeSettings(input.settings);
  if (settings.steps.length === 0) {
    return { ok: false, error: "A form needs at least one step." };
  }
  if (settings.steps.length > MAX_STEPS) {
    return { ok: false, error: `${MAX_STEPS} steps is the maximum.` };
  }

  const stepIds = new Set(settings.steps.map((s) => s.id));
  const fields = input.fields
    .map((f) => normalizeField(f, settings.steps[0].id))
    .filter((f) => f.key && (f.type === "section" || f.type === "recaptcha" || f.label));

  if (fields.filter((f) => INPUT_TYPES.has(f.type)).length === 0) {
    return { ok: false, error: "A form needs at least one input field." };
  }
  if (fields.length > MAX_FIELDS) {
    return { ok: false, error: `${MAX_FIELDS} fields is the maximum.` };
  }

  for (const f of fields) {
    if (!KEY_RE.test(f.key)) {
      return {
        ok: false,
        error: `"${f.key}" is not a valid field key — use lowercase letters, numbers and underscores.`,
      };
    }
    if (f.stepId && !stepIds.has(f.stepId)) {
      return { ok: false, error: `Field "${f.label}" points at a missing step.` };
    }
    if (f.condition?.fieldKey) {
      if (!KEY_RE.test(f.condition.fieldKey)) {
        return { ok: false, error: "Conditional rule references an invalid field key." };
      }
    }
    if ((f.type === "select" || f.type === "radio") && !(f.options?.length)) {
      return { ok: false, error: `"${f.label}" needs at least one option.` };
    }
  }

  const seen = new Set<string>();
  for (const f of fields) {
    if (seen.has(f.key)) return { ok: false, error: `Two fields both use the key "${f.key}".` };
    seen.add(f.key);
  }

  return { ok: true, data: { name, settings, fields } };
}

function normalizeSettings(raw?: FormSettings): FormSettings {
  const base = structuredClone(DEFAULT_SETTINGS);
  const notificationEmail = normalizeNotificationEmail(raw?.notificationEmail);
  const confirmation = normalizeConfirmation(raw?.confirmation);

  if (!raw?.steps?.length) {
    const steps = base.steps;
    return {
      ...base,
      layout: normalizeFormLayout(raw?.layout, steps),
      appearance: mergeAppearance(raw?.appearance) as unknown as Record<string, unknown>,
      ...(notificationEmail ? { notificationEmail } : {}),
      confirmation,
      ...(normalizeRows(raw?.rows).length
        ? { rows: normalizeRows(raw?.rows) }
        : {}),
      ...(Object.keys(normalizeLogic(raw?.logic)).length
        ? { logic: normalizeLogic(raw?.logic) }
        : {}),
      submissionUx: normalizeSubmissionUx(raw?.submissionUx),
      ux: normalizeUx(raw?.ux),
      ...(normalizeTrust(raw?.trust).enabled
        ? { trust: normalizeTrust(raw?.trust) }
        : {}),
      admin: normalizeAdminCrm(raw?.admin),
      analytics: normalizeAnalytics(raw?.analytics),
      security: normalizeSecurity(raw?.security),
      integrations: normalizeIntegrations(raw?.integrations),
      ai: normalizeAi(raw?.ai),
      enterprise: normalizeEnterprise(raw?.enterprise),
    };
  }
  const steps = raw.steps
    .map((s, i) => ({
      id: s.id.trim() || `step_${i + 1}`,
      title: s.title.trim() || `Step ${i + 1}`,
    }))
    .slice(0, MAX_STEPS);
  const trust = normalizeTrust(raw.trust);
  return {
    steps,
    layout: normalizeFormLayout(raw.layout, steps),
    appearance: mergeAppearance(raw.appearance) as unknown as Record<string, unknown>,
    ...(notificationEmail ? { notificationEmail } : {}),
    confirmation,
    ...(normalizeRows(raw.rows).length
      ? { rows: normalizeRows(raw.rows) }
      : {}),
    ...(Object.keys(normalizeLogic(raw.logic)).length
      ? { logic: normalizeLogic(raw.logic) }
      : {}),
    submissionUx: normalizeSubmissionUx(raw.submissionUx),
    ux: normalizeUx(raw.ux),
    ...(trust.enabled ? { trust } : {}),
    admin: normalizeAdminCrm(raw.admin),
    analytics: normalizeAnalytics(raw.analytics),
    security: normalizeSecurity(raw.security),
    integrations: normalizeIntegrations(raw.integrations),
    ai: normalizeAi(raw.ai),
    enterprise: normalizeEnterprise(raw.enterprise),
  };
}

const NOTIFY_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeNotificationEmail(raw?: string): string | undefined {
  const email = raw?.trim().toLowerCase();
  if (!email) return undefined;
  if (!NOTIFY_EMAIL_RE.test(email)) return undefined;
  return email.slice(0, 320);
}

function normalizeConfirmation(
  raw?: FormSettings["confirmation"],
): FormSettings["confirmation"] {
  const rulesIn = Array.isArray(raw?.rules) ? raw.rules : [];
  const rules: NonNullable<FormSettings["confirmation"]>["rules"] = [];

  for (const [i, r] of rulesIn.entries()) {
    const action = r.action === "redirect" ? ("redirect" as const) : ("message" as const);
    const rule: NonNullable<FormSettings["confirmation"]>["rules"][number] = {
      id: (r.id || `rule_${i + 1}`).trim(),
      action,
    };
    if (r.message?.trim()) rule.message = r.message.trim().slice(0, 2000);
    if (r.redirectUrl?.trim()) rule.redirectUrl = r.redirectUrl.trim().slice(0, 2000);
    if (r.showBeforeRedirect) rule.showBeforeRedirect = true;
    if (r.condition?.fieldKey) {
      rule.condition = {
        fieldKey: r.condition.fieldKey.trim().toLowerCase(),
        op: r.condition.op,
        value: r.condition.value,
      };
    }
    if (rule.action === "message" || rule.redirectUrl) {
      rules.push(rule);
    }
  }

  if (!rules.some((r) => !r.condition?.fieldKey)) {
    rules.push({
      id: "default",
      action: "message",
      message: "Thanks — we'll be in touch.",
    });
  }

  return { rules: rules.slice(0, 20) };
}

function normalizeField(f: FormField, fallbackStep: string): FormField {
  return {
    key: f.key.trim().toLowerCase(),
    label: f.label.trim(),
    type: f.type,
    required: Boolean(f.required) && f.type !== "section" && f.type !== "hidden" && f.type !== "recaptcha",
    options: f.options?.map((o) => o.trim()).filter(Boolean),
    placeholder: f.placeholder?.trim() || undefined,
    width: normalizeFieldWidth(f.width as FieldWidthValue),
    ...(f.widthTablet != null
      ? { widthTablet: normalizeFieldWidth(f.widthTablet as FieldWidthValue) }
      : {}),
    ...(f.widthMobile != null
      ? { widthMobile: normalizeFieldWidth(f.widthMobile as FieldWidthValue) }
      : {}),
    stepId: f.stepId?.trim() || fallbackStep,
    condition: normalizeCondition(f.condition),
    ...(normalizeCondition(f.requiredWhen)
      ? { requiredWhen: normalizeCondition(f.requiredWhen) }
      : {}),
    ...(f.locked ? { locked: true } : {}),
    ...(f.pinned ? { pinned: true } : {}),
    ...(f.type === "file"
      ? { fileConfig: resolveFileConfig(f.fileConfig) }
      : {}),
    ...(f.type === "appointment"
      ? { appointmentConfig: resolveAppointmentConfig(f.appointmentConfig) }
      : {}),
    ...(f.type === "roi" ? { roiConfig: resolveRoiConfig(f.roiConfig) } : {}),
    ...(f.description?.trim()
      ? { description: f.description.trim().slice(0, 500) }
      : {}),
    ...(normalizeCaption(f.caption)
      ? { caption: normalizeCaption(f.caption) }
      : {}),
    ...(normalizeContainer(f.container)
      ? { container: normalizeContainer(f.container) }
      : {}),
    ...(f.type === "section" && normalizeSectionConfig(f.sectionConfig)
      ? { sectionConfig: normalizeSectionConfig(f.sectionConfig) }
      : {}),
    ...(f.rowId?.trim() ? { rowId: f.rowId.trim().slice(0, 40) } : {}),
    ...(f.lockWidth ? { lockWidth: true } : {}),
    ...(f.type === "radio" ||
    f.type === "multiselect" ||
    f.type === "select" ||
    f.type === "checkbox"
      ? {
          choiceConfig: resolveChoiceConfig(f.type, f.choiceConfig),
          ...(f.optionItems?.length || f.options?.length
            ? {
                optionItems: (f.optionItems?.length
                  ? f.optionItems
                  : (f.options ?? []).map((o) => ({ value: o, label: o }))
                )
                  .map(normalizeOptionItem)
                  .filter((o): o is NonNullable<typeof o> => Boolean(o))
                  .slice(0, 40),
              }
            : {}),
        }
      : {}),
  };
}
