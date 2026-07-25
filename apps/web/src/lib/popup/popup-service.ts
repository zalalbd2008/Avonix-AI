/**
 * Popup engine service (ADR-010).
 */
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  forms,
  popups,
  popupTemplates,
  websites,
  type Popup,
  type PopupCategory,
  type PopupPayload,
  type PopupStatus,
  type PopupTemplate,
  type PopupType,
  type WebsiteFontSettings,
} from "@/lib/db/schema";
import { defaultPopupPayload, slugifyPopupName } from "@/lib/popup/defaults";
import { embedSnippet, mergeAppearance } from "@/lib/forms/fields";
import { isSafeEmbedUrl } from "@/lib/popup/resolve-form-link";
import { collectGoogleFontUrls } from "@/lib/fonts/google";

type MutationOk = { ok: true; id: string };
type MutationErr = { ok: false; error: string };
type MutationResult = MutationOk | MutationErr;

export async function listPopupsForWebsite(
  agencyId: string,
  websiteId: string,
): Promise<Popup[]> {
  return withAgency(agencyId, async (tx) => {
    return tx
      .select()
      .from(popups)
      .where(
        and(eq(popups.websiteId, websiteId), isNull(popups.deletedAt)),
      )
      .orderBy(asc(popups.priorityRank), desc(popups.updatedAt));
  });
}

export async function getPublishedPopupsConfig(
  agencyId: string,
  websiteId: string,
): Promise<{
  fonts: WebsiteFontSettings | null;
  google_font_urls: string[];
  popups: Array<{
    id: string;
    name: string;
    type: PopupType;
    priority_rank: number;
    payload: PopupPayload;
    /** Form Builder embed HTML (theme + fields) — not the legacy shortcode. */
    form_html?: string | null;
  }>;
}> {
  return withAgency(agencyId, async (tx) => {
    const [site] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    const websiteFonts = site?.settings?.fonts ?? null;

    const rows = await tx
      .select()
      .from(popups)
      .where(
        and(
          eq(popups.websiteId, websiteId),
          eq(popups.status, "published"),
          eq(popups.isEnabled, true),
          isNull(popups.deletedAt),
        ),
      )
      .orderBy(asc(popups.priorityRank));

    const formIds = [
      ...new Set(
        rows
          .map((r) => r.payload?.content?.formId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const formById = new Map<
      string,
      {
        id: string;
        formNumber: number;
        fields: (typeof forms.$inferSelect)["fields"];
        settings: (typeof forms.$inferSelect)["settings"];
        submitLabel: string;
        successMessage: string | null;
      }
    >();

    if (formIds.length > 0) {
      const formRows = await tx
        .select({
          id: forms.id,
          formNumber: forms.formNumber,
          fields: forms.fields,
          settings: forms.settings,
          submitLabel: forms.submitLabel,
          successMessage: forms.successMessage,
          websiteId: forms.websiteId,
          deletedAt: forms.deletedAt,
        })
        .from(forms)
        .where(
          and(
            inArray(forms.id, formIds),
            eq(forms.websiteId, websiteId),
            isNull(forms.deletedAt),
          ),
        );

      for (const f of formRows) {
        formById.set(f.id, f);
      }
    }

    const mapped = rows.map((r) => {
      const formId = r.payload?.content?.formId;
      const form = formId ? formById.get(formId) : undefined;
      let form_html: string | null = null;
      if (form) {
        const snippet = embedSnippet({
          id: form.id,
          formNumber: form.formNumber,
          fields: form.fields,
          settings: form.settings,
          submitLabel: form.submitLabel,
          successMessage: form.successMessage ?? undefined,
        });
        const mode = r.payload?.content?.formStyleMode ?? "inherit";
        form_html =
          mode === "override"
            ? `<div class="avonix-popup-form avonix-popup-form--override">${snippet}</div>`
            : `<div class="avonix-popup-form">${snippet}</div>`;
      }
      const embedCandidate = r.payload?.content?.formEmbedUrl;
      const form_embed_url =
        !form_html && isSafeEmbedUrl(embedCandidate) ? embedCandidate! : null;
      return {
        id: r.id,
        name: r.name,
        type: r.type,
        priority_rank: r.priorityRank,
        payload: r.payload,
        form_html,
        form_embed_url,
      };
    });

    const formFontFamilies: string[] = [];
    for (const f of formById.values()) {
      const appearance = mergeAppearance(f.settings?.appearance);
      if (appearance.typography?.fontFamily) {
        formFontFamilies.push(appearance.typography.fontFamily);
      }
      if (appearance.brandKit?.primaryFont) {
        formFontFamilies.push(appearance.brandKit.primaryFont);
      }
    }

    const google_font_urls = collectGoogleFontUrls({
      website: websiteFonts,
      popups: mapped.map((p) => p.payload),
      extraFamilies: formFontFamilies,
    });

    return {
      fonts: websiteFonts,
      google_font_urls,
      popups: mapped,
    };
  });
}

export async function savePopup(
  agencyId: string,
  userId: string,
  input: {
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
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  const type = input.type ?? input.payload?.type ?? "welcome";
  const payload = input.payload ?? defaultPopupPayload(type);

  return withAgency(agencyId, async (tx) => {
    if (input.id) {
      await tx
        .update(popups)
        .set({
          name,
          description: input.description?.trim() || null,
          type,
          status: input.status ?? "draft",
          priorityRank: input.priorityRank ?? payload.priorityRank ?? 100,
          isEnabled: input.isEnabled ?? true,
          payload: { ...payload, type },
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(and(eq(popups.id, input.id), eq(popups.agencyId, agencyId)));
      return { ok: true, id: input.id };
    }

    const [row] = await tx
      .insert(popups)
      .values({
        agencyId,
        clientId: input.clientId,
        websiteId: input.websiteId,
        name,
        description: input.description?.trim() || null,
        type,
        status: input.status ?? "draft",
        priorityRank: input.priorityRank ?? payload.priorityRank ?? 100,
        isEnabled: input.isEnabled ?? true,
        payload: { ...payload, type },
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: popups.id });

    return { ok: true, id: row.id };
  });
}

export async function hardDeletePopup(
  agencyId: string,
  id: string,
): Promise<MutationResult> {
  return withAgency(agencyId, async (tx) => {
    const deleted = await tx
      .delete(popups)
      .where(and(eq(popups.id, id), eq(popups.agencyId, agencyId)))
      .returning({ id: popups.id });
    if (!deleted.length) {
      return { ok: false, error: "Popup not found." };
    }
    return { ok: true, id };
  });
}

/** @deprecated Use hardDeletePopup — rows are removed from the database. */
export const softDeletePopup = hardDeletePopup;

function templatePayloadSnapshot(payload: PopupPayload): PopupPayload {
  return {
    ...payload,
    content: {
      ...payload.content,
      // Templates are reusable across sites — don't bind a live form id.
      formId: undefined,
      formIds: undefined,
      formEmbedUrl: undefined,
    },
    publishedAt: undefined,
    analyticsId: undefined,
    abTestKey: undefined,
  };
}

export async function listPopupTemplates(
  agencyId: string,
  opts?: {
    userId?: string;
    websiteId?: string;
  },
): Promise<PopupTemplate[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(popupTemplates)
      .where(eq(popupTemplates.agencyId, agencyId))
      .orderBy(desc(popupTemplates.updatedAt));

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
      // organization | global | team
      return true;
    });
  });
}

export async function savePopupAsTemplate(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  input: {
    popupId?: string;
    name: string;
    description?: string;
    type?: PopupType;
    category?: PopupCategory;
    tags?: string[];
    payload: PopupPayload;
    destination: import("@/lib/popup/template-library").PopupTemplateSaveDestination;
    clientId?: string | null;
    websiteId?: string | null;
    teamId?: string | null;
  },
): Promise<MutationResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Template name is required." };

  const {
    canSaveDestination,
    popupDestinationToScopeStatus,
  } = await import("@/lib/popup/template-library");

  if (!canSaveDestination(input.destination, role)) {
    return { ok: false, error: "You don’t have permission for this destination." };
  }
  if (input.destination === "website" && !input.websiteId) {
    return { ok: false, error: "Website is required for this destination." };
  }

  const mapped = popupDestinationToScopeStatus(input.destination);

  return withAgency(agencyId, async (tx) => {
    let payload = templatePayloadSnapshot(input.payload);
    let type = input.type ?? payload.type ?? "custom";
    let category = input.category ?? payload.category;

    if (input.popupId) {
      const [src] = await tx
        .select()
        .from(popups)
        .where(
          and(eq(popups.id, input.popupId), eq(popups.agencyId, agencyId)),
        )
        .limit(1);
      if (!src) return { ok: false, error: "Popup not found." };
      payload = templatePayloadSnapshot(src.payload);
      type = src.type;
      category = input.category ?? src.payload?.category ?? category;
    }

    const [row] = await tx
      .insert(popupTemplates)
      .values({
        agencyId,
        name,
        description: input.description?.trim() || null,
        type,
        category: category ?? null,
        tags: input.tags ?? [],
        payload: { ...payload, type, category: category ?? payload.category },
        scope: mapped.scope,
        status: mapped.status,
        visibility: mapped.visibility,
        clientId: input.clientId ?? null,
        websiteId:
          mapped.scope === "website" ? (input.websiteId ?? null) : null,
        teamId: mapped.scope === "team" ? (input.teamId ?? null) : null,
        sourcePopupId: input.popupId ?? null,
        createdBy: userId,
      })
      .returning({ id: popupTemplates.id });

    return { ok: true, id: row.id };
  });
}

export async function createPopupFromTemplate(
  agencyId: string,
  userId: string,
  input: {
    templateId: string;
    clientId: string;
    websiteId: string;
    name?: string;
  },
): Promise<MutationResult> {
  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(popupTemplates)
      .where(
        and(
          eq(popupTemplates.id, input.templateId),
          eq(popupTemplates.agencyId, agencyId),
        ),
      )
      .limit(1);
    if (!tpl) return { ok: false, error: "Template not found." };

    const name = (input.name?.trim() || tpl.name).trim();
    const payload: PopupPayload = {
      ...tpl.payload,
      type: tpl.type,
      slug: slugifyPopupName(name),
      content: {
        ...tpl.payload.content,
        formId: undefined,
        formIds: undefined,
        formEmbedUrl: undefined,
      },
      publishedAt: undefined,
    };

    const [row] = await tx
      .insert(popups)
      .values({
        agencyId,
        clientId: input.clientId,
        websiteId: input.websiteId,
        name,
        description: tpl.description,
        type: tpl.type,
        status: "draft",
        priorityRank: payload.priorityRank ?? 100,
        isEnabled: true,
        payload,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: popups.id });

    return { ok: true, id: row.id };
  });
}

export async function hardDeletePopupTemplate(
  agencyId: string,
  id: string,
): Promise<MutationResult> {
  return withAgency(agencyId, async (tx) => {
    const deleted = await tx
      .delete(popupTemplates)
      .where(
        and(eq(popupTemplates.id, id), eq(popupTemplates.agencyId, agencyId)),
      )
      .returning({ id: popupTemplates.id });
    if (!deleted.length) {
      return { ok: false, error: "Template not found." };
    }
    return { ok: true, id };
  });
}
