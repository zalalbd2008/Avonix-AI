"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import type {
  FormAssetKind,
  FormField,
  FormLibraryScope,
  FormLibraryStatus,
  FormLibraryVisibility,
} from "@/lib/db/schema";
import {
  bumpComponentUsage,
  bumpSectionUsage,
  getFormComponent,
  getFormSection,
  listFormAssets,
  listFormComponents,
  listFormSections,
  registerFormAsset,
  saveFormComponent,
  saveFormSection,
  softDeleteFormAsset,
  softDeleteFormComponent,
  softDeleteFormSection,
  type LibraryListFilter,
} from "@/lib/forms/org-asset-service";

function revalidateLibrary() {
  revalidatePath("/templates");
}

export async function actionListFormComponents(filter: LibraryListFilter = {}) {
  const ctx = await requireAgency();
  return listFormComponents(ctx.agencyId, ctx.userId, filter);
}

export async function actionListFormSections(filter: LibraryListFilter = {}) {
  const ctx = await requireAgency();
  return listFormSections(ctx.agencyId, ctx.userId, filter);
}

export async function actionListFormAssets(filter: LibraryListFilter = {}) {
  const ctx = await requireAgency();
  return listFormAssets(ctx.agencyId, ctx.userId, filter);
}

export async function actionSaveFormComponent(input: {
  name: string;
  description?: string;
  fields: FormField[];
  category?: string;
  tagsRaw?: string;
  scope?: FormLibraryScope;
  status?: FormLibraryStatus;
  visibility?: FormLibraryVisibility;
  clientId?: string | null;
  websiteId?: string | null;
}) {
  const ctx = await requireAgency();
  const result = await saveFormComponent(ctx.agencyId, ctx.userId, input);
  if (result.ok) revalidateLibrary();
  return result;
}

export async function actionSaveFormSection(input: {
  name: string;
  description?: string;
  fields: FormField[];
  category?: string;
  tagsRaw?: string;
  scope?: FormLibraryScope;
  status?: FormLibraryStatus;
  visibility?: FormLibraryVisibility;
  clientId?: string | null;
  websiteId?: string | null;
}) {
  const ctx = await requireAgency();
  const result = await saveFormSection(ctx.agencyId, ctx.userId, input);
  if (result.ok) revalidateLibrary();
  return result;
}

export async function actionRegisterFormAsset(input: {
  name: string;
  url: string;
  description?: string;
  kind?: FormAssetKind;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  folder?: string;
  tagsRaw?: string;
  scope?: FormLibraryScope;
  visibility?: FormLibraryVisibility;
  clientId?: string | null;
  websiteId?: string | null;
}) {
  const ctx = await requireAgency();
  const result = await registerFormAsset(ctx.agencyId, ctx.userId, input);
  if (result.ok) revalidateLibrary();
  return result;
}

export async function actionDeleteFormComponent(id: string) {
  const ctx = await requireAgency();
  const result = await softDeleteFormComponent(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    id,
  );
  if (result.ok) revalidateLibrary();
  return result;
}

export async function actionDeleteFormSection(id: string) {
  const ctx = await requireAgency();
  const result = await softDeleteFormSection(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    id,
  );
  if (result.ok) revalidateLibrary();
  return result;
}

export async function actionDeleteFormAsset(id: string) {
  const ctx = await requireAgency();
  const result = await softDeleteFormAsset(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    id,
  );
  if (result.ok) revalidateLibrary();
  return result;
}

/** Load fields for insert into the builder + bump usage. */
export async function actionLoadComponentFields(id: string) {
  const ctx = await requireAgency();
  const row = await getFormComponent(ctx.agencyId, id);
  if (!row) return { ok: false as const, error: "Component not found." };
  await bumpComponentUsage(ctx.agencyId, id);
  return { ok: true as const, name: row.name, fields: row.fields };
}

export async function actionLoadSectionFields(id: string) {
  const ctx = await requireAgency();
  const row = await getFormSection(ctx.agencyId, id);
  if (!row) return { ok: false as const, error: "Section not found." };
  await bumpSectionUsage(ctx.agencyId, id);
  return { ok: true as const, name: row.name, fields: row.fields };
}
