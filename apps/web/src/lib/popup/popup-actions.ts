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
