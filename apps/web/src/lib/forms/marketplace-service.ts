/**
 * Marketplace service (ADR-008 / ADR-007 Step 7).
 *
 * Browse published listing snapshots; install copies into the buyer's org.
 */
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  formTemplates,
  formTemplateVersions,
  marketplaceInstalls,
  marketplaceListings,
  type FormField,
  type FormSettings,
  type MarketplaceListing,
} from "@/lib/db/schema";
import { BUILT_IN_FORM_TEMPLATES } from "@/lib/forms/form-templates";
import { DEFAULT_SETTINGS } from "@/lib/forms/fields";

export type MarketplaceCard = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[];
  kind: string;
  isOfficial: boolean;
  isPremium: boolean;
  priceCents: number;
  installCount: number;
  fieldCount: number;
  publisherAgencyId: string | null;
  source: "official" | "community";
  fieldsPreview: { key: string; label: string; type: string }[];
};

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Official packs from code — always available, no cross-tenant DB read. */
export function listOfficialMarketplaceCards(): MarketplaceCard[] {
  return BUILT_IN_FORM_TEMPLATES.map((t) => ({
    id: `official:${t.id}`,
    name: t.name,
    description: t.hint,
    category: "official",
    tags: ["official", "avonix"],
    kind: "template",
    isOfficial: true,
    isPremium: false,
    priceCents: 0,
    installCount: 0,
    fieldCount: t.fields.length,
    publisherAgencyId: null,
    source: "official" as const,
    fieldsPreview: t.fields.slice(0, 8).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
    })),
  }));
}

export async function listCommunityMarketplace(
  agencyId: string,
  filter: { q?: string; mineOnly?: boolean } = {},
): Promise<MarketplaceListing[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select()
      .from(marketplaceListings)
      .where(
        and(
          isNull(marketplaceListings.deletedAt),
          filter.mineOnly
            ? eq(marketplaceListings.agencyId, agencyId)
            : or(
                eq(marketplaceListings.status, "published"),
                eq(marketplaceListings.agencyId, agencyId),
              ),
        ),
      )
      .orderBy(desc(marketplaceListings.installCount), desc(marketplaceListings.updatedAt))
      .limit(200);

    const q = filter.q?.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.description ?? "", r.category ?? "", ...(r.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  });
}

export async function listMarketplaceCatalog(
  agencyId: string,
  filter: { q?: string } = {},
): Promise<MarketplaceCard[]> {
  const official = listOfficialMarketplaceCards();
  const community = await listCommunityMarketplace(agencyId, {
    q: filter.q,
  });

  const communityCards: MarketplaceCard[] = community
    .filter((r) => r.status === "published" || r.agencyId === agencyId)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      tags: r.tags ?? [],
      kind: r.kind,
      isOfficial: r.isOfficial,
      isPremium: r.isPremium,
      priceCents: r.priceCents,
      installCount: r.installCount,
      fieldCount: r.fields?.length ?? 0,
      publisherAgencyId: r.agencyId,
      source: r.isOfficial ? ("official" as const) : ("community" as const),
      fieldsPreview: (r.fields ?? []).slice(0, 8).map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type,
      })),
    }));

  let cards = [...official, ...communityCards];
  const q = filter.q?.trim().toLowerCase();
  if (q) {
    cards = cards.filter((c) =>
      [c.name, c.description ?? "", c.category ?? "", ...c.tags]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }
  return cards;
}

export async function publishTemplateToMarketplace(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  opts: {
    templateId: string;
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    publish?: boolean;
  },
): Promise<{ ok: true; listingId: string } | { ok: false; error: string }> {
  if (role === "member") {
    return {
      ok: false,
      error: "Only admins can publish to the marketplace.",
    };
  }

  return withAgency(agencyId, async (tx) => {
    const [tpl] = await tx
      .select()
      .from(formTemplates)
      .where(
        and(eq(formTemplates.id, opts.templateId), isNull(formTemplates.deletedAt)),
      )
      .limit(1);
    if (!tpl) return { ok: false as const, error: "Template not found." };
    if (!tpl.fields?.length) {
      return { ok: false as const, error: "Template has no fields to publish." };
    }

    const publish = opts.publish !== false;
    const [row] = await tx
      .insert(marketplaceListings)
      .values({
        agencyId,
        kind: "template",
        name: (opts.name ?? tpl.name).trim().slice(0, 120),
        description:
          (opts.description ?? tpl.description)?.trim().slice(0, 2000) || null,
        category: opts.category ?? tpl.category ?? null,
        tags: opts.tags?.slice(0, 20) ?? tpl.tags ?? [],
        status: publish ? "published" : "draft",
        visibility: "public",
        isOfficial: false,
        isPremium: false,
        priceCents: 0,
        fields: cloneJson(tpl.fields),
        settings: cloneJson(tpl.settings ?? { steps: [] }),
        submitLabel: tpl.submitLabel,
        successMessage: tpl.successMessage,
        sourceTemplateId: tpl.id,
        version: tpl.version,
        publishedAt: publish ? sql`now()` : null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({ id: marketplaceListings.id });

    if (!row) return { ok: false as const, error: "Could not create listing." };
    return { ok: true as const, listingId: row.id };
  });
}

export async function setMarketplaceListingStatus(
  agencyId: string,
  userId: string,
  role: "owner" | "admin" | "member",
  listingId: string,
  status: "published" | "draft" | "archived",
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (role === "member") {
    return { ok: false, error: "Only admins can change listing status." };
  }
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.id, listingId),
          eq(marketplaceListings.agencyId, agencyId),
          isNull(marketplaceListings.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return { ok: false as const, error: "Listing not found." };

    await tx
      .update(marketplaceListings)
      .set({
        status,
        publishedAt: status === "published" ? sql`now()` : row.publishedAt,
        updatedBy: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(marketplaceListings.id, listingId));
    return { ok: true as const };
  });
}

export async function installMarketplaceListing(
  agencyId: string,
  userId: string,
  listingId: string,
): Promise<
  | { ok: true; templateId: string; name: string }
  | { ok: false; error: string }
> {
  // Official code packs
  if (listingId.startsWith("official:")) {
    const builtInId = listingId.slice("official:".length);
    const tpl = BUILT_IN_FORM_TEMPLATES.find((t) => t.id === builtInId);
    if (!tpl) return { ok: false, error: "Official pack not found." };
    return installSnapshot(agencyId, userId, {
      listingId: null,
      name: tpl.name,
      description: tpl.hint,
      fields: tpl.fields,
      settings: tpl.settings ?? DEFAULT_SETTINGS,
      submitLabel: tpl.submitLabel,
      successMessage: tpl.successMessage,
      category: "official",
      tags: ["official", "avonix"],
    });
  }

  const listing = await withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.id, listingId),
          isNull(marketplaceListings.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  });

  if (!listing) return { ok: false, error: "Listing not found." };
  if (
    listing.status !== "published" &&
    listing.agencyId !== agencyId
  ) {
    return { ok: false, error: "Listing is not published." };
  }
  if (listing.isPremium && listing.priceCents > 0) {
    return {
      ok: false,
      error: "Paid listings are not enabled yet.",
    };
  }

  const result = await installSnapshot(agencyId, userId, {
    listingId: listing.id,
    name: listing.name,
    description: listing.description,
    fields: listing.fields,
    settings: listing.settings,
    submitLabel: listing.submitLabel,
    successMessage: listing.successMessage,
    category: listing.category,
    tags: listing.tags ?? [],
  });

  if (result.ok && listing.id) {
    await withAgency(agencyId, async (tx) => {
      await tx.execute(
        sql`SELECT bump_marketplace_install_count(${listing.id}::uuid)`,
      );
    });
  }

  return result;
}

async function installSnapshot(
  agencyId: string,
  userId: string,
  snap: {
    listingId: string | null;
    name: string;
    description?: string | null;
    fields: FormField[];
    settings: FormSettings;
    submitLabel?: string;
    successMessage?: string;
    category?: string | null;
    tags?: string[];
  },
): Promise<
  | { ok: true; templateId: string; name: string }
  | { ok: false; error: string }
> {
  const fields = cloneJson(snap.fields);
  const settings = cloneJson(snap.settings ?? DEFAULT_SETTINGS);
  const name = `${snap.name}`.trim().slice(0, 120) || "Installed template";

  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .insert(formTemplates)
      .values({
        agencyId,
        name,
        description: snap.description?.slice(0, 2000) || null,
        category: "other",
        tags: [...(snap.tags ?? []), "marketplace"].slice(0, 20),
        fields,
        settings,
        submitLabel: (snap.submitLabel ?? "Send").slice(0, 80),
        successMessage: (
          snap.successMessage ?? "Thanks — we'll be in touch."
        ).slice(0, 500),
        scope: "organization",
        status: "draft",
        visibility: "organization",
        createdBy: userId,
        updatedBy: userId,
        version: 1,
      })
      .returning({ id: formTemplates.id });

    if (!row) return { ok: false as const, error: "Could not install template." };

    await tx.insert(formTemplateVersions).values({
      agencyId,
      templateId: row.id,
      version: 1,
      changelog: "Installed from marketplace",
      fields,
      settings,
      submitLabel: (snap.submitLabel ?? "Send").slice(0, 80),
      successMessage: (
        snap.successMessage ?? "Thanks — we'll be in touch."
      ).slice(0, 500),
      createdBy: userId,
    });

    if (snap.listingId) {
      await tx
        .insert(marketplaceInstalls)
        .values({
          agencyId,
          listingId: snap.listingId,
          installedTemplateId: row.id,
          installedBy: userId,
        })
        .onConflictDoNothing({
          target: [
            marketplaceInstalls.agencyId,
            marketplaceInstalls.listingId,
          ],
        });
    }

    return { ok: true as const, templateId: row.id, name };
  });
}

export async function listMyMarketplaceInstalls(
  agencyId: string,
): Promise<string[]> {
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({ listingId: marketplaceInstalls.listingId })
      .from(marketplaceInstalls);
    return rows.map((r) => r.listingId);
  });
}
