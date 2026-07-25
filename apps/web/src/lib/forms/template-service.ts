/**
 * Cloud form template CRUD — agency-scoped (ADR-007 Step 1).
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  formTemplates,
  formTemplateVersions,
  type FormField,
  type FormSettings,
  type FormTemplate,
  type FormTemplateCategory,
} from "@/lib/db/schema";
import {
  canSaveDestination,
  destinationToScopeStatus,
  parseTags,
  type TemplateSaveDestination,
  type TemplateSnapshot,
} from "./template-library";
import { listSharedTemplateIdsForUser } from "./template-sharing";
import type { TemplateVersionListItem } from "./template-version";

export type TemplateListFilter = {
  q?: string;
  scope?: FormTemplate["scope"];
  status?: FormTemplate["status"];
  category?: FormTemplateCategory;
  websiteId?: string;
  mineOnly?: boolean;
};

export type SaveCloudTemplateInput = TemplateSnapshot & {
  destination: TemplateSaveDestination;
  teamId?: string;
};

export type TemplateMutationResult =
  | { ok: true; templateId: string }
  | { ok: false; error: string };

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * List templates visible to this user inside the active organization.
 */
export async function listCloudTemplates(
  agencyId: string,
  userId: string,
  filter: TemplateListFilter = {},
  role: "owner" | "admin" | "member" = "member",
): Promise<FormTemplate[]> {
  const sharedIds = new Set(
    await listSharedTemplateIdsForUser(agencyId, userId, role),
  );

  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(formTemplates)
      .where(isNull(formTemplates.deletedAt))
      .orderBy(desc(formTemplates.updatedAt))
      .limit(200);

    return rows.filter((row) => {
      if (filter.scope && row.scope !== filter.scope) return false;
      if (filter.status && row.status !== filter.status) return false;
      if (filter.category && row.category !== filter.category) return false;
      if (filter.websiteId && row.websiteId && row.websiteId !== filter.websiteId) {
        return false;
      }
      if (filter.mineOnly && row.createdBy !== userId) return false;

      const isOwner = row.createdBy === userId;
      const isShared = sharedIds.has(row.id);
      const isAdmin = role === "owner" || role === "admin";

      // Personal templates: creator OR explicitly shared
      if (row.scope === "personal" && !isOwner && !isShared) return false;

      // Private: creator/sharee; org-published private stays visible in-org
      if (row.visibility === "private" && !isOwner && !isShared) {
        if (row.scope !== "organization" || row.status === "draft") {
          return false;
        }
      }

      // Pending approval: creator, admins, or sharees
      if (
        row.status === "pending_approval" &&
        !isOwner &&
        !isAdmin &&
        !isShared
      ) {
        return false;
      }

      if (filter.q?.trim()) {
        const q = filter.q.trim().toLowerCase();
        const hay = [
          row.name,
          row.description ?? "",
          row.category ?? "",
          row.industry ?? "",
          ...(row.tags ?? []),
          ...(row.keywords ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });
}

export async function getCloudTemplate(
  agencyId: string,
  templateId: string,
): Promise<FormTemplate | null> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  });
}

/**
 * Save a form snapshot into the organization cloud library.
 */
export async function saveCloudTemplate(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  input: SaveCloudTemplateInput,
): Promise<TemplateMutationResult> {
  if (!canSaveDestination(input.destination, role)) {
    return {
      ok: false,
      error: "You don’t have permission to save to that destination.",
    };
  }

  const name = input.name?.trim().slice(0, 120);
  if (!name) return { ok: false, error: "Template name is required." };
  if (!Array.isArray(input.fields) || input.fields.length === 0) {
    return { ok: false, error: "Template needs at least one field." };
  }

  if (input.destination === "website" && !input.websiteId) {
    return {
      ok: false,
      error: "Pick a website before saving to This Website.",
    };
  }

  const { scope, status, visibility } = destinationToScopeStatus(
    input.destination,
  );
  const fields = cloneJson(input.fields);
  const settings = cloneJson(input.settings);

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .insert(formTemplates)
      .values({
        agencyId,
        name,
        description: input.description?.trim().slice(0, 2000) || null,
        category: input.category ?? null,
        tags: input.tags?.slice(0, 20) ?? [],
        keywords: [],
        fields,
        settings,
        submitLabel: (input.submitLabel ?? "Send").slice(0, 80),
        successMessage: (
          input.successMessage ?? "Thanks — we'll be in touch."
        ).slice(0, 500),
        scope,
        status,
        visibility,
        clientId: input.clientId ?? null,
        websiteId:
          input.destination === "website" ? (input.websiteId ?? null) : null,
        teamId: input.destination === "team" ? input.teamId?.slice(0, 80) : null,
        sourceFormId: input.sourceFormId ?? null,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning({ id: formTemplates.id });

    if (!row) return { ok: false as const, error: "Could not save template." };

    await tx.insert(formTemplateVersions).values({
      agencyId,
      templateId: row.id,
      version: 1,
      changelog: `Created (${input.destination})`,
      fields,
      settings,
      submitLabel: (input.submitLabel ?? "Send").slice(0, 80),
      successMessage: (
        input.successMessage ?? "Thanks — we'll be in touch."
      ).slice(0, 500),
      createdBy: userId,
    });

    return { ok: true as const, templateId: row.id };
  });
}

export async function duplicateCloudTemplate(
  agencyId: string,
  userId: string,
  templateId: string,
): Promise<TemplateMutationResult> {
  return withAgency(agencyId, async (tx) => {
    const [src] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!src) return { ok: false as const, error: "Template not found." };
    if (src.isLocked) {
      // Locked official templates can still be duplicated
    }

    const [row] = await tx
      .insert(formTemplates)
      .values({
        agencyId,
        name: `${src.name} (copy)`.slice(0, 120),
        description: src.description,
        category: src.category,
        subCategory: src.subCategory,
        industry: src.industry,
        tags: src.tags ?? [],
        keywords: src.keywords ?? [],
        department: src.department,
        language: src.language,
        region: src.region,
        fields: cloneJson(src.fields),
        settings: cloneJson(src.settings),
        submitLabel: src.submitLabel,
        successMessage: src.successMessage,
        scope: "personal",
        status: "draft",
        visibility: "private",
        clientId: src.clientId,
        websiteId: null,
        sourceFormId: src.sourceFormId,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
        isLocked: false,
      })
      .returning({ id: formTemplates.id });

    if (!row) return { ok: false as const, error: "Could not duplicate." };

    await tx.insert(formTemplateVersions).values({
      agencyId,
      templateId: row.id,
      version: 1,
      changelog: `Duplicated from ${src.id}`,
      fields: cloneJson(src.fields),
      settings: cloneJson(src.settings),
      submitLabel: src.submitLabel,
      successMessage: src.successMessage,
      createdBy: userId,
    });

    return { ok: true as const, templateId: row.id };
  });
}

export async function archiveCloudTemplate(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  templateId: string,
): Promise<TemplateMutationResult> {
  return withAgency(agencyId, async (tx) => {
    const [src] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!src) return { ok: false as const, error: "Template not found." };
    if (src.isLocked && role === "member") {
      return { ok: false as const, error: "This template is locked." };
    }
    if (src.scope === "personal" && src.createdBy !== userId) {
      return { ok: false as const, error: "Not your personal template." };
    }

    await tx
      .update(formTemplates)
      .set({
        status: "archived",
        updatedBy: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(formTemplates.id, templateId));

    return { ok: true as const, templateId };
  });
}

export async function softDeleteCloudTemplate(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  templateId: string,
): Promise<TemplateMutationResult> {
  return withAgency(agencyId, async (tx) => {
    const [src] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!src) return { ok: false as const, error: "Template not found." };
    if (src.isLocked && role !== "owner") {
      return { ok: false as const, error: "Locked templates cannot be deleted." };
    }
    if (
      src.scope === "personal" &&
      src.createdBy !== userId &&
      role === "member"
    ) {
      return { ok: false as const, error: "Not your personal template." };
    }

    await tx
      .update(formTemplates)
      .set({
        deletedAt: sql`now()`,
        updatedBy: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(formTemplates.id, templateId));

    return { ok: true as const, templateId };
  });
}

export async function bumpTemplateUsage(
  agencyId: string,
  templateId: string,
): Promise<void> {
  await withAgency(agencyId, async (tx) => {
    await tx
      .update(formTemplates)
      .set({
        usageCount: sql`${formTemplates.usageCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(formTemplates.id, templateId));
  });
}

export type ApplyTemplatePayload = {
  name: string;
  fields: FormField[];
  settings: FormSettings;
  submitLabel: string;
  successMessage: string;
};

export async function loadTemplateForApply(
  agencyId: string,
  userId: string,
  templateId: string,
): Promise<
  | { ok: true; payload: ApplyTemplatePayload }
  | { ok: false; error: string }
> {
  const row = await getCloudTemplate(agencyId, templateId);
  if (!row) return { ok: false, error: "Template not found." };
  if (row.scope === "personal" && row.createdBy !== userId) {
    return { ok: false, error: "This personal template is not shared with you." };
  }
  await bumpTemplateUsage(agencyId, templateId);
  return {
    ok: true,
    payload: {
      name: row.name,
      fields: cloneJson(row.fields),
      settings: cloneJson(row.settings),
      submitLabel: row.submitLabel,
      successMessage: row.successMessage,
    },
  };
}

export type TemplateVersionRow = TemplateVersionListItem;

async function assertTemplateReadable(
  agencyId: string,
  userId: string,
  templateId: string,
) {
  const row = await getCloudTemplate(agencyId, templateId);
  if (!row) return { ok: false as const, error: "Template not found." };
  if (row.scope === "personal" && row.createdBy !== userId) {
    return {
      ok: false as const,
      error: "This personal template is not shared with you.",
    };
  }
  return { ok: true as const, row };
}

/**
 * List version history for a template (newest first).
 */
export async function listTemplateVersions(
  agencyId: string,
  userId: string,
  templateId: string,
): Promise<
  | { ok: true; versions: TemplateVersionRow[]; currentVersion: number }
  | { ok: false; error: string }
> {
  const gate = await assertTemplateReadable(agencyId, userId, templateId);
  if (!gate.ok) return gate;

  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(formTemplateVersions)
      .where(eq(formTemplateVersions.templateId, templateId))
      .orderBy(desc(formTemplateVersions.version))
      .limit(100);

    const currentVersion = gate.row.version;
    return {
      ok: true as const,
      currentVersion,
      versions: rows.map((r) => ({
        id: r.id,
        templateId: r.templateId,
        version: r.version,
        changelog: r.changelog,
        fieldCount: r.fields?.length ?? 0,
        createdBy: r.createdBy,
        createdAt: r.createdAt.toISOString(),
        isCurrent: r.version === currentVersion,
      })),
    };
  });
}

export type TemplateVersionDetail = {
  id: string;
  version: number;
  changelog: string | null;
  fields: FormField[];
  settings: FormSettings;
  submitLabel: string;
  successMessage: string;
  createdBy: string | null;
  createdAt: string;
};

export async function getTemplateVersionDetail(
  agencyId: string,
  userId: string,
  templateId: string,
  version: number,
): Promise<
  | { ok: true; detail: TemplateVersionDetail }
  | { ok: false; error: string }
> {
  const gate = await assertTemplateReadable(agencyId, userId, templateId);
  if (!gate.ok) return gate;

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formTemplateVersions)
      .where(
        and(
          eq(formTemplateVersions.templateId, templateId),
          eq(formTemplateVersions.version, version),
        ),
      )
      .limit(1);
    if (!row) return { ok: false as const, error: "Version not found." };
    return {
      ok: true as const,
      detail: {
        id: row.id,
        version: row.version,
        changelog: row.changelog,
        fields: cloneJson(row.fields),
        settings: cloneJson(row.settings),
        submitLabel: row.submitLabel,
        successMessage: row.successMessage,
        createdBy: row.createdBy,
        createdAt: row.createdAt.toISOString(),
      },
    };
  });
}

/**
 * Publish a new version from a payload (or re-snapshot current head).
 */
export async function publishTemplateVersion(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  opts: {
    templateId: string;
    changelog?: string;
    /** If omitted, snapshots the current template head again. */
    fields?: FormField[];
    settings?: FormSettings;
    submitLabel?: string;
    successMessage?: string;
  },
): Promise<TemplateMutationResult & { version?: number }> {
  return withAgency(agencyId, async (tx) => {
    const [src] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(
          eq(formTemplates.id, opts.templateId),
          isNull(formTemplates.deletedAt),
        ),
      )
      .limit(1);
    if (!src) return { ok: false as const, error: "Template not found." };
    if (src.isLocked && role === "member") {
      return { ok: false as const, error: "This template is locked." };
    }
    if (src.scope === "personal" && src.createdBy !== userId) {
      return { ok: false as const, error: "Not your personal template." };
    }

    const fields = cloneJson(opts.fields ?? src.fields);
    const settings = cloneJson(opts.settings ?? src.settings);
    const submitLabel = (opts.submitLabel ?? src.submitLabel).slice(0, 80);
    const successMessage = (
      opts.successMessage ?? src.successMessage
    ).slice(0, 500);
    const nextVersion = src.version + 1;
    const changelog =
      opts.changelog?.trim().slice(0, 500) || `Published ${nextVersion}`;

    await tx
      .update(formTemplates)
      .set({
        fields,
        settings,
        submitLabel,
        successMessage,
        version: nextVersion,
        updatedBy: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(formTemplates.id, opts.templateId));

    await tx.insert(formTemplateVersions).values({
      agencyId,
      templateId: opts.templateId,
      version: nextVersion,
      changelog,
      fields,
      settings,
      submitLabel,
      successMessage,
      createdBy: userId,
    });

    return {
      ok: true as const,
      templateId: opts.templateId,
      version: nextVersion,
    };
  });
}

/**
 * Restore a prior version → writes a new head version with that payload.
 */
export async function restoreTemplateVersion(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  templateId: string,
  version: number,
): Promise<TemplateMutationResult & { version?: number }> {
  const detail = await getTemplateVersionDetail(
    agencyId,
    userId,
    templateId,
    version,
  );
  if (!detail.ok) return detail;

  return publishTemplateVersion(agencyId, userId, role, {
    templateId,
    changelog: `Restored from v${version}.0`,
    fields: detail.detail.fields,
    settings: detail.detail.settings,
    submitLabel: detail.detail.submitLabel,
    successMessage: detail.detail.successMessage,
  });
}

/**
 * Duplicate a specific version into a new personal draft template.
 */
export async function duplicateTemplateVersion(
  agencyId: string,
  userId: string,
  templateId: string,
  version: number,
): Promise<TemplateMutationResult> {
  const detail = await getTemplateVersionDetail(
    agencyId,
    userId,
    templateId,
    version,
  );
  if (!detail.ok) return detail;

  const gate = await assertTemplateReadable(agencyId, userId, templateId);
  if (!gate.ok) return gate;

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .insert(formTemplates)
      .values({
        agencyId,
        name: `${gate.row.name} (v${version})`.slice(0, 120),
        description: gate.row.description,
        category: gate.row.category,
        tags: gate.row.tags ?? [],
        keywords: gate.row.keywords ?? [],
        fields: cloneJson(detail.detail.fields),
        settings: cloneJson(detail.detail.settings),
        submitLabel: detail.detail.submitLabel,
        successMessage: detail.detail.successMessage,
        scope: "personal",
        status: "draft",
        visibility: "private",
        sourceFormId: gate.row.sourceFormId,
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning({ id: formTemplates.id });

    if (!row) return { ok: false as const, error: "Could not duplicate version." };

    await tx.insert(formTemplateVersions).values({
      agencyId,
      templateId: row.id,
      version: 1,
      changelog: `Duplicated from template ${templateId} v${version}`,
      fields: cloneJson(detail.detail.fields),
      settings: cloneJson(detail.detail.settings),
      submitLabel: detail.detail.submitLabel,
      successMessage: detail.detail.successMessage,
      createdBy: userId,
    });

    return { ok: true as const, templateId: row.id };
  });
}

export { parseTags };
