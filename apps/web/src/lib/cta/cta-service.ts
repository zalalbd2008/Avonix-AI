/**
 * CTA button groups + buttons service (ADR-009).
 */
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  ctaButtonGroups,
  ctaButtons,
  ctaButtonTemplates,
  type CtaButton,
  type CtaButtonGroup,
  type CtaButtonPayload,
  type CtaButtonTemplate,
  type CtaGroupSettings,
  type CtaStatus,
  type CtaTemplateCategory,
} from "@/lib/db/schema";
import { getPreset } from "@/lib/cta/presets";
import { defaultGroupSettings, mergeGroupSettings } from "@/lib/cta/defaults";
import type { TemplateSaveDestination } from "@/lib/forms/template-library";
import {
  canSaveDestination,
  destinationToScopeStatus,
} from "@/lib/forms/template-library";

export { defaultGroupSettings, mergeGroupSettings };
type MutationOk = { ok: true; id: string };
type MutationErr = { ok: false; error: string };
type MutationResult = MutationOk | MutationErr;

export type CtaGroupWithButtons = CtaButtonGroup & { buttons: CtaButton[] };

export async function listCtaGroupsForWebsite(
  agencyId: string,
  websiteId: string,
): Promise<CtaGroupWithButtons[]> {
  return withAgency(agencyId, async (tx) => {
    const groups = await tx
      .select()
      .from(ctaButtonGroups)
      .where(
        and(
          eq(ctaButtonGroups.websiteId, websiteId),
          isNull(ctaButtonGroups.deletedAt),
        ),
      )
      .orderBy(asc(ctaButtonGroups.priorityRank), desc(ctaButtonGroups.updatedAt));

    if (groups.length === 0) return [];

    const buttons = await tx
      .select()
      .from(ctaButtons)
      .where(isNull(ctaButtons.deletedAt))
      .orderBy(asc(ctaButtons.sortOrder));

    const byGroup = new Map<string, CtaButton[]>();
    for (const b of buttons) {
      if (!groups.some((g) => g.id === b.groupId)) continue;
      const list = byGroup.get(b.groupId) ?? [];
      list.push(b);
      byGroup.set(b.groupId, list);
    }

    return groups.map((g) => ({
      ...g,
      buttons: byGroup.get(g.id) ?? [],
    }));
  });
}

/** Published payload for the WordPress connector injector. */
export async function getPublishedCtaConfig(
  agencyId: string,
  websiteId: string,
): Promise<{
  groups: Array<{
    id: string;
    name: string;
    priorityRank: number;
    settings: CtaGroupSettings;
    buttons: Array<{
      id: string;
      name: string;
      sortOrder: number;
      payload: CtaButtonPayload;
    }>;
  }>;
}> {
  return withAgency(agencyId, async (tx) => {
    const groups = await tx
      .select()
      .from(ctaButtonGroups)
      .where(
        and(
          eq(ctaButtonGroups.websiteId, websiteId),
          eq(ctaButtonGroups.status, "published"),
          isNull(ctaButtonGroups.deletedAt),
        ),
      )
      .orderBy(asc(ctaButtonGroups.priorityRank));

    if (groups.length === 0) return { groups: [] };

    const groupIds = new Set(groups.map((g) => g.id));
    const buttons = await tx
      .select()
      .from(ctaButtons)
      .where(
        and(
          eq(ctaButtons.isEnabled, true),
          isNull(ctaButtons.deletedAt),
        ),
      )
      .orderBy(asc(ctaButtons.sortOrder));

    return {
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        priorityRank: g.priorityRank,
        settings: mergeGroupSettings(g.settings),
        buttons: buttons
          .filter((b) => b.groupId === g.id && groupIds.has(b.groupId))
          .map((b) => ({
            id: b.id,
            name: b.name,
            sortOrder: b.sortOrder,
            payload: b.payload,
          })),
      })),
    };
  });
}

export async function saveCtaGroup(
  agencyId: string,
  userId: string,
  input: {
    id?: string;
    clientId: string;
    websiteId: string;
    name: string;
    description?: string;
    status?: CtaStatus;
    priorityRank?: number;
    settings?: CtaGroupSettings;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  return withAgency(agencyId, async (tx) => {
    if (input.id) {
      const nextStatus = input.status ?? "draft";
      await tx
        .update(ctaButtonGroups)
        .set({
          name,
          description: input.description?.trim() || null,
          status: nextStatus,
          priorityRank: input.priorityRank ?? 100,
          settings: input.settings,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(ctaButtonGroups.id, input.id));

      // Keep layer status in sync — published group → all enabled buttons live
      if (nextStatus === "published") {
        await tx
          .update(ctaButtons)
          .set({
            status: "published",
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(ctaButtons.groupId, input.id),
              isNull(ctaButtons.deletedAt),
            ),
          );
      }

      return { ok: true, id: input.id };
    }

    const [row] = await tx
      .insert(ctaButtonGroups)
      .values({
        agencyId,
        clientId: input.clientId,
        websiteId: input.websiteId,
        name,
        description: input.description?.trim() || null,
        status: input.status ?? "draft",
        priorityRank: input.priorityRank ?? 100,
        settings: input.settings,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: ctaButtonGroups.id });

    return { ok: true, id: row.id };
  });
}

export async function softDeleteCtaGroup(
  agencyId: string,
  id: string,
): Promise<MutationResult> {
  return withAgency(agencyId, async (tx) => {
    await tx
      .update(ctaButtonGroups)
      .set({ deletedAt: new Date() })
      .where(eq(ctaButtonGroups.id, id));
    await tx
      .update(ctaButtons)
      .set({ deletedAt: new Date() })
      .where(eq(ctaButtons.groupId, id));
    return { ok: true, id };
  });
}

export async function saveCtaButton(
  agencyId: string,
  userId: string,
  input: {
    id?: string;
    groupId: string;
    name: string;
    status?: CtaStatus;
    sortOrder?: number;
    isEnabled?: boolean;
    payload: CtaButtonPayload;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!input.payload?.label?.trim()) {
    return { ok: false, error: "Button label is required." };
  }

  return withAgency(agencyId, async (tx) => {
    if (input.id) {
      await tx
        .update(ctaButtons)
        .set({
          name,
          status: input.status ?? "published",
          sortOrder: input.sortOrder ?? 0,
          isEnabled: input.isEnabled ?? true,
          payload: input.payload,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(ctaButtons.id, input.id));
      return { ok: true, id: input.id };
    }

    const [row] = await tx
      .insert(ctaButtons)
      .values({
        agencyId,
        groupId: input.groupId,
        name,
        status: input.status ?? "published",
        sortOrder: input.sortOrder ?? 0,
        isEnabled: input.isEnabled ?? true,
        payload: input.payload,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: ctaButtons.id });

    return { ok: true, id: row.id };
  });
}

export async function addButtonsFromPresets(
  agencyId: string,
  userId: string,
  groupId: string,
  presetIds: string[],
): Promise<MutationResult> {
  if (presetIds.length === 0) {
    return { ok: false, error: "Pick at least one preset." };
  }

  return withAgency(agencyId, async (tx) => {
    const existing = await tx
      .select({ sortOrder: ctaButtons.sortOrder })
      .from(ctaButtons)
      .where(and(eq(ctaButtons.groupId, groupId), isNull(ctaButtons.deletedAt)))
      .orderBy(desc(ctaButtons.sortOrder))
      .limit(1);

    let order = (existing[0]?.sortOrder ?? -1) + 1;

    for (const presetId of presetIds) {
      const preset = getPreset(presetId);
      if (!preset) continue;
      await tx.insert(ctaButtons).values({
        agencyId,
        groupId,
        name: preset.name,
        status: "published",
        sortOrder: order++,
        isEnabled: true,
        payload: { ...preset.payload },
        createdBy: userId,
        updatedBy: userId,
      });
    }

    return { ok: true, id: groupId };
  });
}

export async function softDeleteCtaButton(
  agencyId: string,
  id: string,
): Promise<MutationResult> {
  return withAgency(agencyId, async (tx) => {
    await tx
      .update(ctaButtons)
      .set({ deletedAt: new Date() })
      .where(eq(ctaButtons.id, id));
    return { ok: true, id };
  });
}

/** Persist layer order (left→right / top→bottom in the footer). */
export async function reorderCtaButtons(
  agencyId: string,
  userId: string,
  groupId: string,
  orderedIds: string[],
): Promise<MutationResult> {
  if (orderedIds.length === 0) {
    return { ok: false, error: "Nothing to reorder." };
  }

  return withAgency(agencyId, async (tx) => {
    const existing = await tx
      .select({ id: ctaButtons.id })
      .from(ctaButtons)
      .where(
        and(eq(ctaButtons.groupId, groupId), isNull(ctaButtons.deletedAt)),
      );

    const allowed = new Set(existing.map((r) => r.id));
    const ids = orderedIds.filter((id) => allowed.has(id));
    if (ids.length === 0) {
      return { ok: false, error: "No matching buttons in this group." };
    }

    await Promise.all(
      ids.map((id, index) =>
        tx
          .update(ctaButtons)
          .set({
            sortOrder: index,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(ctaButtons.id, id)),
      ),
    );

    return { ok: true, id: groupId };
  });
}

function ctaTemplatePayloadSnapshot(
  payload: CtaButtonPayload,
): CtaButtonPayload {
  return {
    ...payload,
    action: {
      ...payload.action,
      formId: undefined,
      popupId: undefined,
    },
  };
}

function mapCtaDestination(dest: TemplateSaveDestination): {
  scope: CtaButtonTemplate["scope"];
  status: CtaButtonTemplate["status"];
  visibility: CtaButtonTemplate["visibility"];
} {
  const m = destinationToScopeStatus(dest);
  return {
    scope: m.scope,
    status: m.status === "draft" ? "draft" : "published",
    visibility: m.visibility,
  };
}

export async function listCtaButtonTemplates(
  agencyId: string,
  opts?: { userId?: string; websiteId?: string },
): Promise<CtaButtonTemplate[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(ctaButtonTemplates)
      .where(eq(ctaButtonTemplates.agencyId, agencyId))
      .orderBy(desc(ctaButtonTemplates.updatedAt));

    const userId = opts?.userId;
    const websiteId = opts?.websiteId;

    return rows.filter((row) => {
      if (row.status === "archived") return false;
      if (row.scope === "personal") {
        return Boolean(userId && row.createdBy === userId);
      }
      if (row.status === "draft") {
        return Boolean(userId && row.createdBy === userId);
      }
      if (row.scope === "website") {
        if (!websiteId) return false;
        return row.websiteId === websiteId;
      }
      return true;
    });
  });
}

export async function saveCtaButtonAsTemplate(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  input: {
    buttonId?: string;
    name: string;
    description?: string;
    category?: CtaTemplateCategory;
    tags?: string[];
    payload: CtaButtonPayload;
    destination: TemplateSaveDestination;
    clientId?: string | null;
    websiteId?: string | null;
    teamId?: string | null;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Template name is required." };
  if (!canSaveDestination(input.destination, role)) {
    return { ok: false, error: "You don’t have permission for this destination." };
  }
  if (input.destination === "website" && !input.websiteId) {
    return { ok: false, error: "Website is required for this destination." };
  }

  const mapped = mapCtaDestination(input.destination);

  return withAgency(agencyId, async (tx) => {
    let payload = ctaTemplatePayloadSnapshot(input.payload);

    if (input.buttonId) {
      const [src] = await tx
        .select()
        .from(ctaButtons)
        .where(
          and(
            eq(ctaButtons.id, input.buttonId),
            eq(ctaButtons.agencyId, agencyId),
          ),
        )
        .limit(1);
      if (!src) return { ok: false, error: "Button not found." };
      payload = ctaTemplatePayloadSnapshot(src.payload);
    }

    const [row] = await tx
      .insert(ctaButtonTemplates)
      .values({
        agencyId,
        name,
        description: input.description?.trim() || null,
        category: input.category ?? null,
        tags: input.tags ?? [],
        payload,
        scope: mapped.scope,
        status: mapped.status,
        visibility: mapped.visibility,
        clientId: input.clientId ?? null,
        websiteId:
          mapped.scope === "website" ? (input.websiteId ?? null) : null,
        teamId: mapped.scope === "team" ? (input.teamId ?? null) : null,
        sourceButtonId: input.buttonId ?? null,
        createdBy: userId,
      })
      .returning({ id: ctaButtonTemplates.id });

    return { ok: true, id: row.id };
  });
}

export async function createCtaButtonFromTemplate(
  agencyId: string,
  userId: string,
  input: {
    templateId: string;
    groupId: string;
    name?: string;
  },
): Promise<MutationResult> {
  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(ctaButtonTemplates)
      .where(
        and(
          eq(ctaButtonTemplates.id, input.templateId),
          eq(ctaButtonTemplates.agencyId, agencyId),
        ),
      )
      .limit(1);
    if (!tpl) return { ok: false, error: "Template not found." };

    const [group] = await tx
      .select({ id: ctaButtonGroups.id })
      .from(ctaButtonGroups)
      .where(
        and(
          eq(ctaButtonGroups.id, input.groupId),
          eq(ctaButtonGroups.agencyId, agencyId),
          isNull(ctaButtonGroups.deletedAt),
        ),
      )
      .limit(1);
    if (!group) return { ok: false, error: "Button group not found." };

    const existing = await tx
      .select({ sortOrder: ctaButtons.sortOrder })
      .from(ctaButtons)
      .where(
        and(eq(ctaButtons.groupId, input.groupId), isNull(ctaButtons.deletedAt)),
      )
      .orderBy(desc(ctaButtons.sortOrder))
      .limit(1);

    const sortOrder = (existing[0]?.sortOrder ?? -1) + 1;
    const name = (input.name?.trim() || tpl.name).trim();
    const payload = ctaTemplatePayloadSnapshot(tpl.payload);

    const [row] = await tx
      .insert(ctaButtons)
      .values({
        agencyId,
        groupId: input.groupId,
        name,
        status: "published",
        sortOrder,
        isEnabled: true,
        payload: {
          ...payload,
          label: payload.label || name,
        },
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: ctaButtons.id });

    return { ok: true, id: row.id };
  });
}

export async function hardDeleteCtaButtonTemplate(
  agencyId: string,
  id: string,
): Promise<MutationResult> {
  return withAgency(agencyId, async (tx) => {
    const deleted = await tx
      .delete(ctaButtonTemplates)
      .where(
        and(
          eq(ctaButtonTemplates.id, id),
          eq(ctaButtonTemplates.agencyId, agencyId),
        ),
      )
      .returning({ id: ctaButtonTemplates.id });
    if (!deleted.length) {
      return { ok: false, error: "Template not found." };
    }
    return { ok: true, id };
  });
}
