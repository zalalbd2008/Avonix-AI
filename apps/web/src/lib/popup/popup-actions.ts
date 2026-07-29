"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import type {
  PopupCategory,
  PopupPayload,
  PopupStatus,
  PopupType,
} from "@/lib/db/schema";
import {
  createPopupFromTemplate,
  hardDeletePopup,
  hardDeletePopupTemplate,
  listPopupTemplates,
  savePopup,
  savePopupAsTemplate,
} from "@/lib/popup/popup-service";
import { defaultPopupPayload } from "@/lib/popup/defaults";
import type { PopupTemplateSaveDestination } from "@/lib/popup/template-library";
import { parseTags } from "@/lib/popup/template-library";

function revalidatePopups(clientId: string, websiteId: string) {
  revalidatePath(`/clients/${clientId}/websites/${websiteId}/popup`);
  revalidatePath(`/clients/${clientId}/websites/${websiteId}/buttons`);
}

export async function actionListPopups(websiteId: string) {
  const ctx = await requireAgency();
  const { listPopupsForWebsite } = await import("@/lib/popup/popup-service");
  return listPopupsForWebsite(ctx.agencyId, websiteId);
}

export async function actionSavePopup(input: {
  id?: string;
  clientId: string;
  websiteId: string;
  name: string;
  description?: string;
  type?: PopupType;
  status?: PopupStatus;
  priorityRank?: number;
  isEnabled?: boolean;
  payload?: PopupPayload;
}) {
  const ctx = await requireAgency();
  const type = input.type ?? "welcome";
  const result = await savePopup(ctx.agencyId, ctx.userId, {
    ...input,
    type,
    payload: input.payload ?? defaultPopupPayload(type),
  });
  if (result.ok) revalidatePopups(input.clientId, input.websiteId);
  return result;
}

/** Permanently removes the popup row from the database (agency-scoped). */
export async function actionDeletePopup(input: {
  id: string;
  clientId: string;
  websiteId: string;
}) {
  const ctx = await requireAgency();
  const result = await hardDeletePopup(ctx.agencyId, input.id);
  if (result.ok) revalidatePopups(input.clientId, input.websiteId);
  return result;
}

export async function actionListPopupTemplates(input?: {
  websiteId?: string;
}) {
  const ctx = await requireAgency();
  return listPopupTemplates(ctx.agencyId, {
    userId: ctx.userId,
    websiteId: input?.websiteId,
  });
}

export async function actionSavePopupAsTemplate(input: {
  popupId?: string;
  clientId: string;
  websiteId: string;
  name: string;
  description?: string;
  type?: PopupType;
  category?: PopupCategory;
  tagsRaw?: string;
  payload: PopupPayload;
  destination: PopupTemplateSaveDestination;
  teamId?: string;
}) {
  const ctx = await requireAgency();
  const result = await savePopupAsTemplate(ctx.agencyId, ctx.userId, ctx.role, {
    popupId: input.popupId,
    name: input.name,
    description: input.description,
    type: input.type,
    category: input.category,
    tags: parseTags(input.tagsRaw ?? ""),
    payload: input.payload,
    destination: input.destination,
    clientId: input.clientId,
    websiteId: input.websiteId,
    teamId: input.teamId,
  });
  if (result.ok) revalidatePopups(input.clientId, input.websiteId);
  return result;
}

export async function actionCreatePopupFromTemplate(input: {
  templateId: string;
  clientId: string;
  websiteId: string;
  name?: string;
}) {
  const ctx = await requireAgency();
  const result = await createPopupFromTemplate(ctx.agencyId, ctx.userId, input);
  if (result.ok) revalidatePopups(input.clientId, input.websiteId);
  return result;
}

export async function actionDeletePopupTemplate(input: {
  id: string;
  clientId: string;
  websiteId: string;
}) {
  const ctx = await requireAgency();
  const result = await hardDeletePopupTemplate(ctx.agencyId, input.id);
  if (result.ok) revalidatePopups(input.clientId, input.websiteId);
  return result;
}

/** Load form fields for popup studio live preview (not the dashed placeholder). */
export async function actionGetPopupFormPreview(input: {
  clientId: string;
  websiteId: string;
  formId: string;
}): Promise<
  | {
      ok: true;
      name: string;
      fields: import("@/lib/db/schema").FormField[];
      steps: import("@/lib/db/schema").FormStep[];
      submitLabel: string;
      appearance: ReturnType<
        typeof import("@/lib/forms/fields").mergeAppearance
      >;
      layout?: import("@/lib/db/schema").FormLayoutConfig;
      logic?: import("@/lib/db/schema").FormLogicConfig;
    }
  | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  const { and, eq, isNull } = await import("drizzle-orm");
  const { withAgency } = await import("@/lib/db");
  const { forms } = await import("@/lib/db/schema");
  const { DEFAULT_STEP_ID, mergeAppearance } = await import(
    "@/lib/forms/fields"
  );

  const row = await withAgency(ctx.agencyId, async (tx) => {
    const [form] = await tx
      .select({
        id: forms.id,
        name: forms.name,
        fields: forms.fields,
        settings: forms.settings,
        submitLabel: forms.submitLabel,
      })
      .from(forms)
      .where(
        and(
          eq(forms.id, input.formId),
          eq(forms.clientId, input.clientId),
          eq(forms.websiteId, input.websiteId),
          isNull(forms.deletedAt),
        ),
      )
      .limit(1);
    return form ?? null;
  });

  if (!row) return { ok: false, error: "Form not found for this website." };

  const steps = row.settings?.steps?.length
    ? row.settings.steps
    : [{ id: DEFAULT_STEP_ID, title: "Step 1" }];

  return {
    ok: true,
    name: row.name,
    fields: row.fields,
    steps,
    submitLabel: row.submitLabel,
    appearance: mergeAppearance(row.settings?.appearance),
    layout: row.settings?.layout,
    logic: row.settings?.logic,
  };
}
