"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import type {
  CtaButtonPayload,
  CtaGroupSettings,
  CtaStatus,
} from "@/lib/db/schema";
import {
  addButtonsFromPresets,
  createCtaButtonFromTemplate,
  hardDeleteCtaButtonTemplate,
  listCtaButtonTemplates,
  listCtaGroupsForWebsite,
  reorderCtaButtons,
  saveCtaButton,
  saveCtaButtonAsTemplate,
  saveCtaGroup,
  softDeleteCtaButton,
  softDeleteCtaGroup,
} from "@/lib/cta/cta-service";
import { defaultGroupSettings } from "@/lib/cta/defaults";
import type { TemplateSaveDestination } from "@/lib/forms/template-library";
import { parseTags } from "@/lib/forms/template-library";
import type { CtaTemplateCategory } from "@/lib/db/schema";

function revalidateButtons(clientId: string, websiteId: string) {
  revalidatePath(`/clients/${clientId}/websites/${websiteId}/buttons`);
}

export async function actionListCtaGroups(websiteId: string) {
  const ctx = await requireAgency();
  return listCtaGroupsForWebsite(ctx.agencyId, websiteId);
}

export async function actionSaveCtaGroup(input: {
  id?: string;
  clientId: string;
  websiteId: string;
  name: string;
  description?: string;
  status?: CtaStatus;
  priorityRank?: number;
  settings?: CtaGroupSettings;
}) {
  const ctx = await requireAgency();
  const result = await saveCtaGroup(ctx.agencyId, ctx.userId, {
    ...input,
    settings: input.settings ?? defaultGroupSettings(),
  });
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionDeleteCtaGroup(input: {
  id: string;
  clientId: string;
  websiteId: string;
}) {
  const ctx = await requireAgency();
  const result = await softDeleteCtaGroup(ctx.agencyId, input.id);
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionSaveCtaButton(input: {
  id?: string;
  groupId: string;
  clientId: string;
  websiteId: string;
  name: string;
  status?: CtaStatus;
  sortOrder?: number;
  isEnabled?: boolean;
  payload: CtaButtonPayload;
}) {
  const ctx = await requireAgency();
  const result = await saveCtaButton(ctx.agencyId, ctx.userId, input);
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionAddFromPresets(input: {
  groupId: string;
  clientId: string;
  websiteId: string;
  presetIds: string[];
}) {
  const ctx = await requireAgency();
  const result = await addButtonsFromPresets(
    ctx.agencyId,
    ctx.userId,
    input.groupId,
    input.presetIds,
  );
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionDeleteCtaButton(input: {
  id: string;
  clientId: string;
  websiteId: string;
}) {
  const ctx = await requireAgency();
  const result = await softDeleteCtaButton(ctx.agencyId, input.id);
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionReorderCtaButtons(input: {
  groupId: string;
  clientId: string;
  websiteId: string;
  orderedIds: string[];
}) {
  const ctx = await requireAgency();
  const result = await reorderCtaButtons(
    ctx.agencyId,
    ctx.userId,
    input.groupId,
    input.orderedIds,
  );
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionListCtaButtonTemplates(input?: {
  websiteId?: string;
}) {
  const ctx = await requireAgency();
  return listCtaButtonTemplates(ctx.agencyId, {
    userId: ctx.userId,
    websiteId: input?.websiteId,
  });
}

export async function actionSaveCtaButtonAsTemplate(input: {
  buttonId?: string;
  clientId: string;
  websiteId: string;
  name: string;
  description?: string;
  category?: CtaTemplateCategory;
  tagsRaw?: string;
  payload: CtaButtonPayload;
  destination: TemplateSaveDestination;
  teamId?: string;
}) {
  const ctx = await requireAgency();
  const result = await saveCtaButtonAsTemplate(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    {
      buttonId: input.buttonId,
      name: input.name,
      description: input.description,
      category: input.category,
      tags: parseTags(input.tagsRaw ?? ""),
      payload: input.payload,
      destination: input.destination,
      clientId: input.clientId,
      websiteId: input.websiteId,
      teamId: input.teamId,
    },
  );
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionCreateCtaButtonFromTemplate(input: {
  templateId: string;
  groupId: string;
  clientId: string;
  websiteId: string;
  name?: string;
}) {
  const ctx = await requireAgency();
  const result = await createCtaButtonFromTemplate(ctx.agencyId, ctx.userId, {
    templateId: input.templateId,
    groupId: input.groupId,
    name: input.name,
  });
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}

export async function actionDeleteCtaButtonTemplate(input: {
  id: string;
  clientId: string;
  websiteId: string;
}) {
  const ctx = await requireAgency();
  const result = await hardDeleteCtaButtonTemplate(ctx.agencyId, input.id);
  if (result.ok) revalidateButtons(input.clientId, input.websiteId);
  return result;
}
