"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { createFormForClient } from "@/lib/forms/service";
import {
  archiveCloudTemplate,
  duplicateCloudTemplate,
  duplicateTemplateVersion,
  getTemplateVersionDetail,
  listCloudTemplates,
  listTemplateVersions,
  loadTemplateForApply,
  publishTemplateVersion,
  restoreTemplateVersion,
  saveCloudTemplate,
  softDeleteCloudTemplate,
  type SaveCloudTemplateInput,
  type TemplateListFilter,
} from "@/lib/forms/template-service";
import {
  addTemplateToCollection,
  createTemplateCollection,
  deleteTemplateCollection,
  listCollectionTemplateIds,
  listFavoriteTemplateIds,
  listTemplateCollections,
  removeTemplateFromCollection,
  toggleTemplateFavorite,
} from "@/lib/forms/template-collections";
import { parseTags } from "@/lib/forms/template-library";
import { compareTemplatePayloads } from "@/lib/forms/template-version";
import {
  listOrgMembersForSharing,
  listTemplateShares,
  removeTemplateShare,
  reviewTemplateApproval,
  setTemplateLocked,
  shareTemplate,
  submitTemplateForApproval,
} from "@/lib/forms/template-sharing";
import type {
  FormTemplateSharePermission,
  FormTemplateShareTarget,
} from "@/lib/db/schema";

export async function actionListCloudTemplates(filter: TemplateListFilter = {}) {
  const ctx = await requireAgency();
  return listCloudTemplates(ctx.agencyId, ctx.userId, filter, ctx.role);
}

export async function actionSaveCloudTemplate(
  input: SaveCloudTemplateInput & { tagsRaw?: string },
) {
  const ctx = await requireAgency();
  const tags = input.tags?.length
    ? input.tags
    : input.tagsRaw
      ? parseTags(input.tagsRaw)
      : [];
  const result = await saveCloudTemplate(ctx.agencyId, ctx.userId, ctx.role, {
    ...input,
    tags,
  });
  if (result.ok) {
    revalidatePath("/templates");
  }
  return result;
}

export async function actionDuplicateCloudTemplate(templateId: string) {
  const ctx = await requireAgency();
  const result = await duplicateCloudTemplate(
    ctx.agencyId,
    ctx.userId,
    templateId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionArchiveCloudTemplate(templateId: string) {
  const ctx = await requireAgency();
  const result = await archiveCloudTemplate(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    templateId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionDeleteCloudTemplate(templateId: string) {
  const ctx = await requireAgency();
  const result = await softDeleteCloudTemplate(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    templateId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

/**
 * Create a new live form on a client/website from a cloud template.
 */
export async function actionUseCloudTemplate(opts: {
  templateId: string;
  clientId: string;
  websiteId?: string;
}) {
  const ctx = await requireAgency();
  const loaded = await loadTemplateForApply(
    ctx.agencyId,
    ctx.userId,
    opts.templateId,
  );
  if (!loaded.ok) return loaded;

  const created = await createFormForClient(ctx.agencyId, {
    clientId: opts.clientId,
    websiteId: opts.websiteId,
    name: loaded.payload.name,
    fields: loaded.payload.fields.map((f) => ({
      ...f,
      stepId: f.stepId,
    })),
    settings: loaded.payload.settings,
    submitLabel: loaded.payload.submitLabel,
    successMessage: loaded.payload.successMessage,
  });

  if (created.ok) {
    revalidatePath("/templates");
    revalidatePath(`/clients/${opts.clientId}/forms`);
  }
  return created;
}

export async function actionListTemplateVersions(templateId: string) {
  const ctx = await requireAgency();
  return listTemplateVersions(ctx.agencyId, ctx.userId, templateId);
}

export async function actionPublishTemplateVersion(opts: {
  templateId: string;
  changelog?: string;
}) {
  const ctx = await requireAgency();
  const result = await publishTemplateVersion(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionRestoreTemplateVersion(opts: {
  templateId: string;
  version: number;
}) {
  const ctx = await requireAgency();
  const result = await restoreTemplateVersion(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts.templateId,
    opts.version,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionDuplicateTemplateVersion(opts: {
  templateId: string;
  version: number;
}) {
  const ctx = await requireAgency();
  const result = await duplicateTemplateVersion(
    ctx.agencyId,
    ctx.userId,
    opts.templateId,
    opts.version,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionCompareTemplateVersions(opts: {
  templateId: string;
  versionA: number;
  versionB: number;
}) {
  const ctx = await requireAgency();
  const [a, b] = await Promise.all([
    getTemplateVersionDetail(
      ctx.agencyId,
      ctx.userId,
      opts.templateId,
      opts.versionA,
    ),
    getTemplateVersionDetail(
      ctx.agencyId,
      ctx.userId,
      opts.templateId,
      opts.versionB,
    ),
  ]);
  if (!a.ok) return a;
  if (!b.ok) return b;
  return {
    ok: true as const,
    versionA: opts.versionA,
    versionB: opts.versionB,
    diff: compareTemplatePayloads(a.detail, b.detail),
  };
}

export async function actionToggleTemplateFavorite(templateId: string) {
  const ctx = await requireAgency();
  const result = await toggleTemplateFavorite(
    ctx.agencyId,
    ctx.userId,
    templateId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionCreateTemplateCollection(opts: {
  name: string;
  description?: string;
  visibility?: "personal" | "organization";
}) {
  const ctx = await requireAgency();
  const result = await createTemplateCollection(ctx.agencyId, ctx.userId, opts);
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionDeleteTemplateCollection(collectionId: string) {
  const ctx = await requireAgency();
  const result = await deleteTemplateCollection(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    collectionId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionAddToCollection(opts: {
  collectionId: string;
  templateId: string;
}) {
  const ctx = await requireAgency();
  const result = await addTemplateToCollection(
    ctx.agencyId,
    ctx.userId,
    opts.collectionId,
    opts.templateId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionRemoveFromCollection(opts: {
  collectionId: string;
  templateId: string;
}) {
  const ctx = await requireAgency();
  const result = await removeTemplateFromCollection(
    ctx.agencyId,
    ctx.userId,
    opts.collectionId,
    opts.templateId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionListCollectionTemplateIds(collectionId: string) {
  const ctx = await requireAgency();
  return listCollectionTemplateIds(ctx.agencyId, collectionId);
}

// Keep list helpers for server pages
export async function actionListFavoritesAndCollections() {
  const ctx = await requireAgency();
  const [favoriteIds, collections] = await Promise.all([
    listFavoriteTemplateIds(ctx.agencyId, ctx.userId),
    listTemplateCollections(ctx.agencyId, ctx.userId),
  ]);
  return { favoriteIds, collections };
}

export async function actionListOrgMembers() {
  const ctx = await requireAgency();
  return listOrgMembersForSharing(ctx.agencyId);
}

export async function actionListTemplateShares(templateId: string) {
  const ctx = await requireAgency();
  return listTemplateShares(ctx.agencyId, templateId);
}

export async function actionShareTemplate(opts: {
  templateId: string;
  targetType: FormTemplateShareTarget;
  targetUserId?: string;
  targetRole?: "owner" | "admin" | "member";
  teamId?: string;
  permissions?: FormTemplateSharePermission[];
}) {
  const ctx = await requireAgency();
  const result = await shareTemplate(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionRemoveTemplateShare(shareId: string) {
  const ctx = await requireAgency();
  const result = await removeTemplateShare(ctx.agencyId, ctx.role, shareId);
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionSetTemplateLocked(opts: {
  templateId: string;
  locked: boolean;
}) {
  const ctx = await requireAgency();
  const result = await setTemplateLocked(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts.templateId,
    opts.locked,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionSubmitTemplateForApproval(templateId: string) {
  const ctx = await requireAgency();
  const result = await submitTemplateForApproval(
    ctx.agencyId,
    ctx.userId,
    templateId,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}

export async function actionReviewTemplateApproval(opts: {
  templateId: string;
  decision: "approve" | "reject";
  note?: string;
}) {
  const ctx = await requireAgency();
  const result = await reviewTemplateApproval(
    ctx.agencyId,
    ctx.userId,
    ctx.role,
    opts,
  );
  if (result.ok) revalidatePath("/templates");
  return result;
}
