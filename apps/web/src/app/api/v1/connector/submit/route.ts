import { and, eq, isNull } from "drizzle-orm";
import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import {
  contacts,
  conversations,
  formSubmissions,
  forms,
  messages,
  websites,
  type FormField,
} from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { formSubmissionEmail } from "@/lib/email/templates/form-submission";
import {
  adminNotifyTargets,
  fireCrmWebhooks,
  initialSubmissionCrm,
  normalizeAdminCrm,
} from "@/lib/forms/admin-crm";
import { normalizeSubmissionMeta } from "@/lib/forms/analytics";
import {
  enforceFormSecurity,
  generateOtpCode,
  normalizeSecurity,
  sendFormOtpEmail,
} from "@/lib/forms/security";
import { dispatchFormIntegrations } from "@/lib/forms/integrations";
import {
  analyzeFormLead,
  applyAiCrmPatch,
  normalizeAi,
} from "@/lib/forms/ai";
import {
  computeUniqueScores,
  mintPortalToken,
  normalizeEnterprise,
} from "@/lib/forms/enterprise";
import type {
  FormAdminCrmConfig,
  FormAiConfig,
  FormEnterpriseConfig,
  FormIntegrationsConfig,
  FormSecurityConfig,
  FormSubmissionCrm,
  FormSubmissionMeta,
} from "@/lib/db/schema";

const MAX_BODY_BYTES = 64 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FORM_NUMBER_RE = /^[1-9]\d{0,8}$/;

/**
 * POST /api/v1/connector/submit
 *
 * A form submission from a connected site. This is the first half of the loop in
 * ADR-003: capture → inbox → pipeline.
 *
 * Contacts belong to the *client*, not the website (ADR-002 §4), so a person who
 * fills in forms on two of a client's sites is one contact with two touchpoints,
 * not two records.
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  // Per-site, so one busy site cannot exhaust another's budget.
  const limit = await rateLimit(`submit:${identity.websiteId}`, 300, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many submissions.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return connectorError("too_large", 413, "Submission too large.");
  }

  let body: {
    form_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    page_url?: string;
    fields?: Record<string, unknown>;
    hp?: string;
    meta?: FormSubmissionMeta;
    captcha_token?: string;
    otp?: string;
    otp_request?: boolean;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  // Resolve form early so security can run before we create contacts.
  const formRow = body.form_id
    ? await resolveSubmitForm(identity, body.form_id.trim())
    : null;

  const security = normalizeSecurity(formRow?.settings?.security);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const countryHeader = request.headers.get("x-vercel-ip-country");
  const country = countryHeader
    ? decodeURIComponent(countryHeader).toUpperCase()
    : null;

  // Honeypot: silent success when enabled (default).
  if (
    security.honeypot !== false &&
    typeof body.hp === "string" &&
    body.hp.trim() !== ""
  ) {
    return Response.json({ status: "ok" });
  }

  const name = str(body.name, 200);
  const email = str(body.email, 320)?.toLowerCase() ?? null;
  const phone = str(body.phone, 50);
  const message = str(body.message, 5000);
  const fieldValues = (body.fields ?? {}) as Record<string, unknown>;
  const submissionMeta = normalizeSubmissionMeta(body.meta);
  const captchaToken = str(body.captcha_token, 4000);
  const otp = str(body.otp, 12);

  // OTP request — send code, do not create a lead yet.
  if (body.otp_request && formRow) {
    if (!security.otp?.enabled) {
      return connectorError("bad_request", 400, "OTP is not enabled for this form.");
    }
    if (!email || !EMAIL_RE.test(email)) {
      return connectorError("bad_request", 400, "A valid email is required for OTP.");
    }
    const pre = await enforceFormSecurity({
      formId: formRow.id,
      security,
      ip,
      country,
      email,
      captchaToken,
      skipOtpVerify: true,
    });
    if (!pre.ok) {
      return connectorError(pre.code, pre.status ?? 400, pre.message);
    }
    const code = generateOtpCode(
      formRow.id,
      email,
      security.otp?.ttlMinutes ?? 10,
    );
    try {
      await sendFormOtpEmail({
        to: email,
        formName: formRow.name,
        code,
        ttlMinutes: security.otp?.ttlMinutes ?? 10,
      });
    } catch (err) {
      console.error("form otp email failed", err);
      return connectorError("otp_send_failed", 502, "Could not send the code.");
    }
    return Response.json({ status: "ok", otp_sent: true });
  }

  if (!email && !phone && !name && !message && Object.keys(fieldValues).length === 0) {
    return connectorError("bad_request", 400, "Submission was empty.");
  }
  if (email && !EMAIL_RE.test(email)) {
    return connectorError("bad_request", 400, "That email is not valid.");
  }

  if (formRow) {
    const check = await enforceFormSecurity({
      formId: formRow.id,
      security,
      ip,
      country,
      email,
      captchaToken,
      otp,
    });
    if (!check.ok) {
      return connectorError(check.code, check.status ?? 400, check.message);
    }
  }

  let leadValues = fieldValues;
  let leadMeta = submissionMeta;
  let leadMessage = message;
  let aiCrmPatch: Partial<FormSubmissionCrm> | undefined;
  let portalUrl: string | null = null;

  if (formRow && normalizeAi(formRow.settings?.ai).enabled !== false) {
    try {
      const analyzed = await analyzeFormLead(formRow.settings?.ai, {
        agencyId: identity.agencyId,
        formId: formRow.id,
        formName: formRow.name,
        values: fieldValues,
        contact: {
          name,
          email,
          phone,
          message,
        },
      });
      leadValues = analyzed.values;
      leadMeta = {
        ...submissionMeta,
        ...(Object.keys(analyzed.ai).length ? { ai: analyzed.ai } : {}),
      };
      aiCrmPatch = analyzed.crmPatch;
      if (
        analyzed.ai.rewrittenMessage &&
        normalizeAi(formRow.settings?.ai).rewriteMessage
      ) {
        leadMessage = analyzed.ai.rewrittenMessage;
      }
    } catch (err) {
      console.error("form AI analyze failed", err);
    }
  }

  if (formRow) {
    const enterprise = normalizeEnterprise(formRow.settings?.enterprise);
    if (enterprise.enabled !== false && enterprise.uniqueScores !== false) {
      const scores = computeUniqueScores(enterprise, {
        values: leadValues,
        contact: { name, email, phone, message: leadMessage },
        ai: leadMeta.ai,
      });
      if (Object.keys(scores).length) {
        leadMeta = { ...leadMeta, scores };
      }
    }
  }

  const result = await withAgency(identity.agencyId, async (tx) => {
    // Dedupe on (client, email) — matching ADR-002 §4 and the unique index.
    // Without an email there is nothing reliable to match on, so it is a new
    // contact each time.
    let contactId: string | null = null;

    if (email) {
      const [existing] = await tx
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.clientId, identity.clientId), eq(contacts.email, email)))
        .limit(1);

      if (existing) {
        contactId = existing.id;
        await tx
          .update(contacts)
          .set({ name: name ?? undefined, phone: phone ?? undefined, updatedAt: new Date() })
          .where(eq(contacts.id, existing.id));
      }
    }

    if (!contactId) {
      const [created] = await tx
        .insert(contacts)
        .values({
          agencyId: identity.agencyId,
          clientId: identity.clientId,
          sourceWebsiteId: identity.websiteId,
          name,
          email,
          phone,
          status: "new",
          fields: leadValues,
        })
        .returning({ id: contacts.id });
      contactId = created.id;
    }

    const [conversation] = await tx
      .insert(conversations)
      .values({
        agencyId: identity.agencyId,
        clientId: identity.clientId,
        contactId,
        websiteId: identity.websiteId,
        channel: "form",
        status: "open",
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id });

    await tx.insert(messages).values({
      agencyId: identity.agencyId,
      conversationId: conversation.id,
      author: "visitor",
      body: leadMessage ?? summarise({ name, email, phone }),
    });

    const [site] = await tx
      .select({ name: websites.name })
      .from(websites)
      .where(eq(websites.id, identity.websiteId))
      .limit(1);

    let notify: {
      to: string;
      formName: string;
      websiteName: string | null;
      fields: FormField[];
    } | null = null;

    let crmNotify: {
      admin: FormAdminCrmConfig;
      formName: string;
      websiteName: string | null;
      values: Record<string, unknown>;
      crm: FormSubmissionCrm;
      extraEmails: string[];
    } | null = null;

    let integrationsNotify: {
      integrations: FormIntegrationsConfig;
      formId: string;
      formName: string;
      websiteName: string | null;
      values: Record<string, unknown>;
      crm: FormSubmissionCrm | null;
    } | null = null;

    if (formRow) {
      const form = formRow;
      const admin = normalizeAdminCrm(form.settings?.admin);
      let crm =
        admin.enabled !== false ? initialSubmissionCrm(admin) : {};
      if (admin.enabled !== false && aiCrmPatch) {
        crm = applyAiCrmPatch(crm as FormSubmissionCrm, aiCrmPatch);
      }

      const [submission] = await tx
        .insert(formSubmissions)
        .values({
          agencyId: identity.agencyId,
          formId: form.id,
          contactId,
          websiteId: identity.websiteId,
          values: leadValues,
          pageUrl: str(body.page_url, 2000),
          ipAddress: ip,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          crm,
          meta: leadMeta,
        })
        .returning({ id: formSubmissions.id });

      const enterprise = normalizeEnterprise(form.settings?.enterprise);
      if (
        submission?.id &&
        enterprise.enabled !== false &&
        enterprise.clientPortal !== false
      ) {
        const token = mintPortalToken({
          agencyId: identity.agencyId,
          submissionId: submission.id,
        });
        const nextMeta = { ...leadMeta, portalToken: token };
        await tx
          .update(formSubmissions)
          .set({ meta: nextMeta })
          .where(eq(formSubmissions.id, submission.id));
        leadMeta = nextMeta;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
        portalUrl = `${appUrl.replace(/\/$/, "")}/p/${token}`;
      }

      const to = form.settings?.notificationEmail?.trim().toLowerCase();
      if (to && EMAIL_RE.test(to)) {
        notify = {
          to,
          formName: form.name,
          websiteName: site?.name ?? null,
          fields: form.fields,
        };
      }

      if (admin.enabled !== false) {
        const targets = adminNotifyTargets(admin);
        const primary = to && EMAIL_RE.test(to) ? to : "";
        crmNotify = {
          admin,
          formName: form.name,
          websiteName: site?.name ?? null,
          values: leadValues,
          crm: crm as FormSubmissionCrm,
          extraEmails: targets.emails.filter((e) => e !== primary),
        };
      }

      if (form.settings?.integrations) {
        integrationsNotify = {
          integrations: form.settings.integrations,
          formId: form.id,
          formName: form.name,
          websiteName: site?.name ?? null,
          values: leadValues,
          crm: admin.enabled !== false ? (crm as FormSubmissionCrm) : null,
        };
      }
    }

    await tx
      .update(websites)
      .set({ lastSeenAt: new Date() })
      .where(eq(websites.id, identity.websiteId));

    return {
      contactId,
      conversationId: conversation.id,
      notify,
      crmNotify,
      integrationsNotify,
      pageUrl: str(body.page_url, 2000),
      portalUrl,
    };
  });

  if (result.notify) {
    const rows = buildNotificationRows(result.notify.fields, {
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      message: leadMessage ?? null,
      fields: leadValues,
    });
    try {
      await sendEmail(
        formSubmissionEmail({
          to: result.notify.to,
          formName: result.notify.formName,
          websiteName: result.notify.websiteName,
          pageUrl: result.pageUrl,
          rows,
          replyTo: email,
        }),
      );
    } catch (err) {
      // Submission already saved — never fail the visitor response because mail failed.
      console.error("form submission email failed", err);
    }
  }

  if (result.crmNotify) {
    const rows = buildNotificationRows([], {
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      message: leadMessage ?? null,
      fields: leadValues,
    });
    for (const to of result.crmNotify.extraEmails) {
      try {
        await sendEmail(
          formSubmissionEmail({
            to,
            formName: result.crmNotify.formName,
            websiteName: result.crmNotify.websiteName,
            pageUrl: result.pageUrl,
            rows,
            replyTo: email,
          }),
        );
      } catch (err) {
        console.error("crm extra email failed", err);
      }
    }
    try {
      await fireCrmWebhooks({
        admin: result.crmNotify.admin,
        formName: result.crmNotify.formName,
        websiteName: result.crmNotify.websiteName,
        pageUrl: result.pageUrl,
        values: result.crmNotify.values,
        crm: result.crmNotify.crm,
      });
    } catch (err) {
      console.error("crm webhooks failed", err);
    }
  }

  if (result.integrationsNotify) {
    try {
      await dispatchFormIntegrations(result.integrationsNotify.integrations, {
        formId: result.integrationsNotify.formId,
        formName: result.integrationsNotify.formName,
        websiteName: result.integrationsNotify.websiteName,
        pageUrl: result.pageUrl,
        values: result.integrationsNotify.values,
        contact: {
          name: name ?? null,
          email: email ?? null,
          phone: phone ?? null,
          message: leadMessage ?? null,
        },
        crm: result.integrationsNotify.crm,
        meta: leadMeta,
        utm: leadMeta.utm,
      });
    } catch (err) {
      console.error("form integrations failed", err);
    }
  }

  return Response.json({
    status: "ok",
    contact_id: result.contactId,
    conversation_id: result.conversationId,
    ...(result.portalUrl ? { portal_url: result.portalUrl } : {}),
  });
}

async function resolveSubmitForm(
  identity: {
    agencyId: string;
    clientId: string;
    websiteId: string;
  },
  rawId: string,
): Promise<{
  id: string;
  name: string;
  fields: FormField[];
  settings: {
    notificationEmail?: string;
    admin?: FormAdminCrmConfig;
    security?: FormSecurityConfig;
    integrations?: FormIntegrationsConfig;
    ai?: FormAiConfig;
    enterprise?: FormEnterpriseConfig;
  } | null;
} | null> {
  return withAgency(identity.agencyId, async (tx) => {
    if (UUID_RE.test(rawId)) {
      const [row] = await tx
        .select({
          id: forms.id,
          name: forms.name,
          fields: forms.fields,
          settings: forms.settings,
        })
        .from(forms)
        .where(
          and(
            eq(forms.id, rawId),
            eq(forms.clientId, identity.clientId),
            isNull(forms.deletedAt),
          ),
        )
        .limit(1);
      return row ?? null;
    }
    if (FORM_NUMBER_RE.test(rawId)) {
      const [row] = await tx
        .select({
          id: forms.id,
          name: forms.name,
          fields: forms.fields,
          settings: forms.settings,
        })
        .from(forms)
        .where(
          and(
            eq(forms.formNumber, Number(rawId)),
            eq(forms.websiteId, identity.websiteId),
            eq(forms.clientId, identity.clientId),
            isNull(forms.deletedAt),
          ),
        )
        .limit(1);
      return row ?? null;
    }
    return null;
  });
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function summarise(p: { name?: string | null; email?: string | null; phone?: string | null }) {
  const parts = [p.name, p.email, p.phone].filter(Boolean);
  return parts.length ? `Form submission — ${parts.join(" · ")}` : "Form submission";
}

function buildNotificationRows(
  fields: FormField[],
  payload: {
    name: string | null;
    email: string | null;
    phone: string | null;
    message: string | null;
    fields: Record<string, unknown>;
  },
): { label: string; value: string }[] {
  const values: Record<string, unknown> = { ...payload.fields };
  if (payload.name) values.name ??= payload.name;
  if (payload.email) values.email ??= payload.email;
  if (payload.phone) values.phone ??= payload.phone;
  if (payload.message) values.message ??= payload.message;

  const rows: { label: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const f of fields) {
    if (f.type === "section" || f.type === "recaptcha" || f.type === "hidden") continue;
    const raw = values[f.key];
    const value = formatValue(raw);
    if (!value) continue;
    rows.push({ label: f.label || f.key, value });
    seen.add(f.key);
  }

  for (const [key, raw] of Object.entries(values)) {
    if (seen.has(key)) continue;
    const value = formatValue(raw);
    if (!value) continue;
    rows.push({ label: key, value });
  }

  return rows;
}

function formatValue(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  if (Array.isArray(raw)) return raw.map((v) => formatValue(v)).filter(Boolean).join(", ");
  try {
    return JSON.stringify(raw);
  } catch {
    return "";
  }
}
