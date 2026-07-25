"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { formSubmissions, forms } from "@/lib/db/schema";
import type {
  FormLeadPriority,
  FormSubmissionCrm,
} from "@/lib/db/schema";
import {
  appendTimeline,
  normalizeAdminCrm,
  normalizeSubmissionCrm,
  priorityLabel,
  statusLabel,
} from "@/lib/forms/admin-crm";

type CrmPatch = {
  priority?: FormLeadPriority;
  statusId?: string;
  tags?: string[];
  assignee?: string;
  notes?: string;
  /** Append a free-form note to timeline without replacing notes body. */
  addNote?: string;
};

export async function updateSubmissionCrm(input: {
  clientId: string;
  formId: string;
  submissionId: string;
  patch: CrmPatch;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  const actor = ctx.userEmail;

  try {
    await withAgency(ctx.agencyId, async (tx) => {
      const [form] = await tx
        .select({
          id: forms.id,
          clientId: forms.clientId,
          websiteId: forms.websiteId,
          settings: forms.settings,
        })
        .from(forms)
        .where(
          and(eq(forms.id, input.formId), eq(forms.clientId, input.clientId)),
        )
        .limit(1);
      if (!form) throw new Error("Form not found.");

      const [row] = await tx
        .select({
          id: formSubmissions.id,
          crm: formSubmissions.crm,
        })
        .from(formSubmissions)
        .where(
          and(
            eq(formSubmissions.id, input.submissionId),
            eq(formSubmissions.formId, input.formId),
          ),
        )
        .limit(1);
      if (!row) throw new Error("Submission not found.");

      const admin = normalizeAdminCrm(form.settings?.admin);
      let crm = normalizeSubmissionCrm(row.crm, admin);
      const patch = input.patch;

      if (patch.priority && patch.priority !== crm.priority) {
        crm = appendTimeline(
          { ...crm, priority: patch.priority },
          {
            type: "priority",
            message: `Priority → ${priorityLabel(patch.priority)}`,
            actor,
          },
        );
      }

      if (patch.statusId && patch.statusId !== crm.statusId) {
        crm = appendTimeline(
          { ...crm, statusId: patch.statusId },
          {
            type: "status",
            message: `Status → ${statusLabel(admin, patch.statusId)}`,
            actor,
          },
        );
      }

      if (patch.assignee !== undefined && patch.assignee !== crm.assignee) {
        const assignee = patch.assignee.trim().slice(0, 160);
        crm = appendTimeline(
          { ...crm, assignee },
          {
            type: "assign",
            message: assignee
              ? `Assigned to ${assignee}`
              : "Unassigned",
            actor,
          },
        );
      }

      if (patch.tags) {
        const tags = patch.tags
          .map((t) => t.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 20);
        const prev = new Set(crm.tags ?? []);
        const next = new Set(tags);
        const added = tags.filter((t) => !prev.has(t));
        const removed = [...prev].filter((t) => !next.has(t));
        crm = { ...crm, tags };
        if (added.length || removed.length) {
          const parts = [
            ...(added.length ? [`+${added.join(", ")}`] : []),
            ...(removed.length ? [`−${removed.join(", ")}`] : []),
          ];
          crm = appendTimeline(crm, {
            type: "tag",
            message: `Tags ${parts.join(" · ")}`,
            actor,
          });
        }
      }

      if (patch.notes !== undefined && patch.notes !== crm.notes) {
        crm = {
          ...crm,
          notes: patch.notes.trim().slice(0, 8000),
        };
      }

      if (patch.addNote?.trim()) {
        const note = patch.addNote.trim().slice(0, 500);
        crm = appendTimeline(
          {
            ...crm,
            notes: crm.notes
              ? `${crm.notes}\n\n${note}`.slice(0, 8000)
              : note,
          },
          { type: "note", message: note, actor },
        );
      }

      const saved: FormSubmissionCrm = normalizeSubmissionCrm(crm, admin);

      await tx
        .update(formSubmissions)
        .set({ crm: saved, updatedAt: new Date() })
        .where(eq(formSubmissions.id, row.id));

      revalidatePath(`/clients/${input.clientId}/forms/${input.formId}`);
      if (form.websiteId) {
        revalidatePath(
          `/clients/${input.clientId}/websites/${form.websiteId}/forms`,
        );
      }
    });

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not update lead.",
    };
  }
}
