import { eq } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  formSubmissions,
  forms,
  type FormSubmissionCrm,
  type FormSubmissionMeta,
  type FormUniqueScores,
} from "@/lib/db/schema";
import { normalizeAdminCrm } from "@/lib/forms/admin-crm";
import { normalizeEnterprise, verifyPortalToken } from "@/lib/forms/enterprise";

export type PortalLead = {
  agencyId: string;
  formName: string;
  brandName?: string;
  logoUrl?: string;
  hideAvonix?: boolean;
  status: string;
  priority?: string;
  createdAt: Date;
  scores?: FormUniqueScores;
  summary?: string;
};

/** Resolve a public client-portal token to a read-only lead card. */
export async function loadPortalLead(token: string): Promise<PortalLead | null> {
  const verified = verifyPortalToken(token);
  if (!verified) return null;

  const row = await withAgency(verified.agencyId, async (tx) => {
    const [sub] = await tx
      .select({
        id: formSubmissions.id,
        formId: formSubmissions.formId,
        crm: formSubmissions.crm,
        meta: formSubmissions.meta,
        createdAt: formSubmissions.createdAt,
      })
      .from(formSubmissions)
      .where(eq(formSubmissions.id, verified.submissionId))
      .limit(1);
    if (!sub) return null;

    const meta = (sub.meta ?? {}) as FormSubmissionMeta;
    if (meta.portalToken && meta.portalToken !== token) return null;

    const [form] = await tx
      .select({ name: forms.name, settings: forms.settings })
      .from(forms)
      .where(eq(forms.id, sub.formId))
      .limit(1);
    if (!form) return null;

    const enterprise = normalizeEnterprise(form.settings?.enterprise);
    if (enterprise.enabled === false || enterprise.clientPortal === false) {
      return null;
    }

    const crm = (sub.crm ?? {}) as FormSubmissionCrm;
    const admin = normalizeAdminCrm(form.settings?.admin);
    const statusLabel =
      admin.statuses?.find((s) => s.id === crm.statusId)?.label ||
      crm.statusId ||
      "Received";

    return {
      agencyId: verified.agencyId,
      formName: form.name,
      brandName: enterprise.whiteLabel?.brandName,
      logoUrl: enterprise.whiteLabel?.logoUrl,
      hideAvonix: enterprise.whiteLabel?.hideAvonix,
      status: statusLabel,
      priority: crm.priority,
      createdAt: sub.createdAt,
      scores: meta.scores,
      summary: meta.scores?.summary,
    } satisfies PortalLead;
  });

  return row;
}
