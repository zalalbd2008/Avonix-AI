/**
 * Org Components / Sections / Assets service (ADR-007 Step 5).
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  formAssets,
  formComponents,
  formSections,
  type FormAsset,
  type FormAssetKind,
  type FormComponent,
  type FormField,
  type FormLibraryScope,
  type FormLibraryStatus,
  type FormLibraryVisibility,
  type FormSection,
} from "@/lib/db/schema";
import { parseTags } from "@/lib/forms/template-library";

export type LibraryListFilter = {
  q?: string;
  scope?: FormLibraryScope;
  status?: FormLibraryStatus;
  mineOnly?: boolean;
  kind?: FormAssetKind;
  folder?: string;
};

type MutationOk = { ok: true; id: string };
type MutationErr = { ok: false; error: string };
type MutationResult = MutationOk | MutationErr;

function visibleToUser<
  T extends {
    scope: FormLibraryScope;
    visibility: FormLibraryVisibility;
    status: string;
    createdBy: string | null;
  },
>(row: T, userId: string): boolean {
  if (row.scope === "personal" && row.createdBy !== userId) return false;
  if (
    row.visibility === "private" &&
    row.createdBy !== userId &&
    row.status === "draft"
  ) {
    return false;
  }
  return true;
}

function matchQuery(
  haystack: (string | null | undefined)[],
  tags: string[],
  q?: string,
): boolean {
  if (!q?.trim()) return true;
  const needle = q.trim().toLowerCase();
  const hay = [...haystack, ...tags].join(" ").toLowerCase();
  return hay.includes(needle);
}

export async function listFormComponents(
  agencyId: string,
  userId: string,
  filter: LibraryListFilter = {},
): Promise<FormComponent[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(formComponents)
      .where(isNull(formComponents.deletedAt))
      .orderBy(desc(formComponents.updatedAt))
      .limit(200);

    return rows.filter((row) => {
      if (filter.scope && row.scope !== filter.scope) return false;
      if (filter.status && row.status !== filter.status) return false;
      if (filter.mineOnly && row.createdBy !== userId) return false;
      if (!visibleToUser(row, userId)) return false;
      return matchQuery(
        [row.name, row.description, row.category],
        row.tags ?? [],
        filter.q,
      );
    });
  });
}

export async function listFormSections(
  agencyId: string,
  userId: string,
  filter: LibraryListFilter = {},
): Promise<FormSection[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(formSections)
      .where(isNull(formSections.deletedAt))
      .orderBy(desc(formSections.updatedAt))
      .limit(200);

    return rows.filter((row) => {
      if (filter.scope && row.scope !== filter.scope) return false;
      if (filter.status && row.status !== filter.status) return false;
      if (filter.mineOnly && row.createdBy !== userId) return false;
      if (!visibleToUser(row, userId)) return false;
      return matchQuery(
        [row.name, row.description, row.category],
        row.tags ?? [],
        filter.q,
      );
    });
  });
}

export async function listFormAssets(
  agencyId: string,
  userId: string,
  filter: LibraryListFilter = {},
): Promise<FormAsset[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(formAssets)
      .where(isNull(formAssets.deletedAt))
      .orderBy(desc(formAssets.updatedAt))
      .limit(200);

    return rows.filter((row) => {
      if (filter.kind && row.kind !== filter.kind) return false;
      if (filter.folder && row.folder !== filter.folder) return false;
      if (filter.scope && row.scope !== filter.scope) return false;
      if (filter.mineOnly && row.createdBy !== userId) return false;
      if (row.scope === "personal" && row.createdBy !== userId) return false;
      if (row.visibility === "private" && row.createdBy !== userId) return false;
      return matchQuery(
        [row.name, row.description, row.folder, row.mimeType, row.url],
        row.tags ?? [],
        filter.q,
      );
    });
  });
}

export async function saveFormComponent(
  agencyId: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    fields: FormField[];
    category?: string;
    tags?: string[];
    tagsRaw?: string;
    scope?: FormLibraryScope;
    status?: FormLibraryStatus;
    visibility?: FormLibraryVisibility;
    clientId?: string | null;
    websiteId?: string | null;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!input.fields?.length) {
    return { ok: false, error: "Add at least one field to save a component." };
  }

  const tags = input.tags?.length
    ? input.tags
    : input.tagsRaw
      ? parseTags(input.tagsRaw)
      : [];

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .insert(formComponents)
      .values({
        agencyId,
        name: name.slice(0, 120),
        description: input.description?.trim().slice(0, 500) || null,
        fields: input.fields,
        category: input.category || null,
        tags,
        scope: input.scope ?? "organization",
        status: input.status ?? "published",
        visibility: input.visibility ?? "organization",
        clientId: input.clientId ?? null,
        websiteId: input.websiteId ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: formComponents.id });

    if (!row) return { ok: false as const, error: "Could not save component." };
    return { ok: true as const, id: row.id };
  });
}

export async function saveFormSection(
  agencyId: string,
  userId: string,
  input: {
    name: string;
    description?: string;
    fields: FormField[];
    category?: string;
    tags?: string[];
    tagsRaw?: string;
    scope?: FormLibraryScope;
    status?: FormLibraryStatus;
    visibility?: FormLibraryVisibility;
    clientId?: string | null;
    websiteId?: string | null;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!input.fields?.length) {
    return { ok: false, error: "Add at least one field to save a section." };
  }

  const tags = input.tags?.length
    ? input.tags
    : input.tagsRaw
      ? parseTags(input.tagsRaw)
      : [];

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .insert(formSections)
      .values({
        agencyId,
        name: name.slice(0, 120),
        description: input.description?.trim().slice(0, 500) || null,
        fields: input.fields,
        category: input.category || null,
        tags,
        scope: input.scope ?? "organization",
        status: input.status ?? "published",
        visibility: input.visibility ?? "organization",
        clientId: input.clientId ?? null,
        websiteId: input.websiteId ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: formSections.id });

    if (!row) return { ok: false as const, error: "Could not save section." };
    return { ok: true as const, id: row.id };
  });
}

export async function registerFormAsset(
  agencyId: string,
  userId: string,
  input: {
    name: string;
    url: string;
    description?: string;
    kind?: FormAssetKind;
    mimeType?: string;
    sizeBytes?: number;
    width?: number;
    height?: number;
    folder?: string;
    tags?: string[];
    tagsRaw?: string;
    scope?: FormLibraryScope;
    visibility?: FormLibraryVisibility;
    clientId?: string | null;
    websiteId?: string | null;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  const url = input.url.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!url) return { ok: false, error: "URL is required." };
  try {
    // Validate absolute URL shape without fetching.
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    return { ok: false, error: "Enter a valid absolute URL." };
  }

  const tags = input.tags?.length
    ? input.tags
    : input.tagsRaw
      ? parseTags(input.tagsRaw)
      : [];

  const kind =
    input.kind ??
    (guessAssetKind(url, input.mimeType) as FormAssetKind);

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .insert(formAssets)
      .values({
        agencyId,
        name: name.slice(0, 120),
        description: input.description?.trim().slice(0, 500) || null,
        url: url.slice(0, 2000),
        kind,
        mimeType: input.mimeType || null,
        sizeBytes: input.sizeBytes ?? null,
        width: input.width ?? null,
        height: input.height ?? null,
        folder: input.folder?.trim().slice(0, 80) || null,
        tags,
        scope: input.scope ?? "organization",
        visibility: input.visibility ?? "organization",
        clientId: input.clientId ?? null,
        websiteId: input.websiteId ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: formAssets.id });

    if (!row) return { ok: false as const, error: "Could not register asset." };
    return { ok: true as const, id: row.id };
  });
}

export function guessAssetKind(
  url: string,
  mimeType?: string | null,
): FormAssetKind {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)) {
    return "image";
  }
  if (mime.startsWith("video/") || /\.(mp4|webm|mov)(\?|$)/i.test(url)) {
    return "video";
  }
  if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url)) return "font";
  if (
    mime.includes("pdf") ||
    mime.includes("document") ||
    /\.(pdf|docx?|xlsx?|zip)(\?|$)/i.test(url)
  ) {
    return "document";
  }
  if (/\.svg(\?|$)/i.test(url)) return "icon";
  return "other";
}

export async function bumpComponentUsage(
  agencyId: string,
  id: string,
): Promise<void> {
  await withAgency(agencyId, async (tx) => {
    await tx
      .update(formComponents)
      .set({
        usageCount: sql`${formComponents.usageCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(formComponents.id, id));
  });
}

export async function bumpSectionUsage(
  agencyId: string,
  id: string,
): Promise<void> {
  await withAgency(agencyId, async (tx) => {
    await tx
      .update(formSections)
      .set({
        usageCount: sql`${formSections.usageCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(formSections.id, id));
  });
}

export async function softDeleteFormComponent(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formComponents)
      .where(and(eq(formComponents.id, id), isNull(formComponents.deletedAt)))
      .limit(1);
    if (!row) return { ok: false as const, error: "Component not found." };
    if (row.isLocked && role === "member") {
      return { ok: false as const, error: "This component is locked." };
    }
    if (row.scope === "personal" && row.createdBy !== userId) {
      return { ok: false as const, error: "Not your personal component." };
    }
    await tx
      .update(formComponents)
      .set({ deletedAt: sql`now()`, updatedBy: userId, updatedAt: sql`now()` })
      .where(eq(formComponents.id, id));
    return { ok: true as const };
  });
}

export async function softDeleteFormSection(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formSections)
      .where(and(eq(formSections.id, id), isNull(formSections.deletedAt)))
      .limit(1);
    if (!row) return { ok: false as const, error: "Section not found." };
    if (row.isLocked && role === "member") {
      return { ok: false as const, error: "This section is locked." };
    }
    if (row.scope === "personal" && row.createdBy !== userId) {
      return { ok: false as const, error: "Not your personal section." };
    }
    await tx
      .update(formSections)
      .set({ deletedAt: sql`now()`, updatedBy: userId, updatedAt: sql`now()` })
      .where(eq(formSections.id, id));
    return { ok: true as const };
  });
}

export async function softDeleteFormAsset(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formAssets)
      .where(and(eq(formAssets.id, id), isNull(formAssets.deletedAt)))
      .limit(1);
    if (!row) return { ok: false as const, error: "Asset not found." };
    if (row.scope === "personal" && row.createdBy !== userId && role === "member") {
      return { ok: false as const, error: "Not your personal asset." };
    }
    await tx
      .update(formAssets)
      .set({ deletedAt: sql`now()`, updatedBy: userId, updatedAt: sql`now()` })
      .where(eq(formAssets.id, id));
    return { ok: true as const };
  });
}

export async function getFormComponent(
  agencyId: string,
  id: string,
): Promise<FormComponent | null> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formComponents)
      .where(and(eq(formComponents.id, id), isNull(formComponents.deletedAt)))
      .limit(1);
    return row ?? null;
  });
}

export async function getFormSection(
  agencyId: string,
  id: string,
): Promise<FormSection | null> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formSections)
      .where(and(eq(formSections.id, id), isNull(formSections.deletedAt)))
      .limit(1);
    return row ?? null;
  });
}
