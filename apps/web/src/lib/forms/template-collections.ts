/**
 * Favorites + collections for the org template library (ADR-007 Step 3).
 */
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  formTemplateCollectionItems,
  formTemplateCollections,
  formTemplateFavorites,
  formTemplates,
  type FormTemplateCollection,
} from "@/lib/db/schema";

export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  visibility: "personal" | "organization";
  createdBy: string | null;
  itemCount: number;
};

export async function listFavoriteTemplateIds(
  agencyId: string,
  userId: string,
): Promise<string[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({ templateId: formTemplateFavorites.templateId })
      .from(formTemplateFavorites)
      .where(eq(formTemplateFavorites.userId, userId));
    return rows.map((r) => r.templateId);
  });
}

export async function toggleTemplateFavorite(
  agencyId: string,
  userId: string,
  templateId: string,
): Promise<{ ok: true; favorited: boolean } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select({ id: formTemplates.id })
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!tpl) return { ok: false as const, error: "Template not found." };

    const [existing] = await tx
      .select({ id: formTemplateFavorites.id })
      .from(formTemplateFavorites)
      .where(
        and(
          eq(formTemplateFavorites.userId, userId),
          eq(formTemplateFavorites.templateId, templateId),
        ),
      )
      .limit(1);

    if (existing) {
      await tx
        .delete(formTemplateFavorites)
        .where(eq(formTemplateFavorites.id, existing.id));
      return { ok: true as const, favorited: false };
    }

    await tx.insert(formTemplateFavorites).values({
      agencyId,
      userId,
      templateId,
    });
    return { ok: true as const, favorited: true };
  });
}

export async function listTemplateCollections(
  agencyId: string,
  userId: string,
): Promise<CollectionSummary[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(formTemplateCollections)
      .where(isNull(formTemplateCollections.deletedAt))
      .orderBy(asc(formTemplateCollections.name))
      .limit(80);

    const visible = rows.filter(
      (c) =>
        c.visibility === "organization" ||
        c.createdBy === userId ||
        c.visibility === "personal",
    );
    // personal only for owner
    const mine = visible.filter(
      (c) =>
        c.visibility === "organization" ||
        (c.visibility === "personal" && c.createdBy === userId),
    );

    const counts = await tx
      .select({
        collectionId: formTemplateCollectionItems.collectionId,
        n: sql<number>`count(*)::int`,
      })
      .from(formTemplateCollectionItems)
      .groupBy(formTemplateCollectionItems.collectionId);

    const countMap = new Map(counts.map((c) => [c.collectionId, c.n]));

    return mine.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      visibility: c.visibility as "personal" | "organization",
      createdBy: c.createdBy,
      itemCount: countMap.get(c.id) ?? 0,
    }));
  });
}

export async function createTemplateCollection(
  agencyId: string,
  userId: string,
  opts: {
    name: string;
    description?: string;
    visibility?: "personal" | "organization";
  },
): Promise<
  | { ok: true; collectionId: string }
  | { ok: false; error: string }
> {
  const name = opts.name.trim().slice(0, 80);
  if (!name) return { ok: false, error: "Collection name is required." };

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .insert(formTemplateCollections)
      .values({
        agencyId,
        name,
        description: opts.description?.trim().slice(0, 400) || null,
        visibility: opts.visibility ?? "personal",
        createdBy: userId,
      })
      .returning({ id: formTemplateCollections.id });
    if (!row) return { ok: false as const, error: "Could not create collection." };
    return { ok: true as const, collectionId: row.id };
  });
}

export async function deleteTemplateCollection(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  collectionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(formTemplateCollections)
      .where(
        and(
          eq(formTemplateCollections.id, collectionId),
          isNull(formTemplateCollections.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return { ok: false as const, error: "Collection not found." };
    if (
      row.visibility === "personal" &&
      row.createdBy !== userId &&
      role === "member"
    ) {
      return { ok: false as const, error: "Not your collection." };
    }
    await tx
      .update(formTemplateCollections)
      .set({ deletedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(formTemplateCollections.id, collectionId));
    return { ok: true as const };
  });
}

export async function listCollectionTemplateIds(
  agencyId: string,
  collectionId: string,
): Promise<string[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({ templateId: formTemplateCollectionItems.templateId })
      .from(formTemplateCollectionItems)
      .where(eq(formTemplateCollectionItems.collectionId, collectionId))
      .orderBy(asc(formTemplateCollectionItems.sortOrder));
    return rows.map((r) => r.templateId);
  });
}

export async function addTemplateToCollection(
  agencyId: string,
  userId: string,
  collectionId: string,
  templateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [col] = await tx
      .select()
      .from(formTemplateCollections)
      .where(
        and(
          eq(formTemplateCollections.id, collectionId),
          isNull(formTemplateCollections.deletedAt),
        ),
      )
      .limit(1);
    if (!col) return { ok: false as const, error: "Collection not found." };
    if (col.visibility === "personal" && col.createdBy !== userId) {
      return { ok: false as const, error: "Not your collection." };
    }

    const [tpl] = await tx
      .select({ id: formTemplates.id })
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!tpl) return { ok: false as const, error: "Template not found." };

    const [existing] = await tx
      .select({ id: formTemplateCollectionItems.id })
      .from(formTemplateCollectionItems)
      .where(
        and(
          eq(formTemplateCollectionItems.collectionId, collectionId),
          eq(formTemplateCollectionItems.templateId, templateId),
        ),
      )
      .limit(1);
    if (existing) return { ok: true as const };

    const [{ m }] = await tx
      .select({
        m: sql<number>`coalesce(max(${formTemplateCollectionItems.sortOrder}), 0)`,
      })
      .from(formTemplateCollectionItems)
      .where(eq(formTemplateCollectionItems.collectionId, collectionId));

    await tx.insert(formTemplateCollectionItems).values({
      agencyId,
      collectionId,
      templateId,
      sortOrder: (m ?? 0) + 1,
    });
    return { ok: true as const };
  });
}

export async function removeTemplateFromCollection(
  agencyId: string,
  userId: string,
  collectionId: string,
  templateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [col] = await tx
      .select()
      .from(formTemplateCollections)
      .where(eq(formTemplateCollections.id, collectionId))
      .limit(1);
    if (!col) return { ok: false as const, error: "Collection not found." };
    if (col.visibility === "personal" && col.createdBy !== userId) {
      return { ok: false as const, error: "Not your collection." };
    }
    await tx
      .delete(formTemplateCollectionItems)
      .where(
        and(
          eq(formTemplateCollectionItems.collectionId, collectionId),
          eq(formTemplateCollectionItems.templateId, templateId),
        ),
      );
    return { ok: true as const };
  });
}

export type { FormTemplateCollection };
