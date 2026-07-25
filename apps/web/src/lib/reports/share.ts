import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, withAgency } from "@/lib/db";
import { reportShares, websites, type TrackedEventBranding } from "@/lib/db/schema";

/**
 * Public report links.
 *
 * `report_shares` is one of the five tables exempt from row-level security, for
 * the same reason as connector keys and reply tokens: a visitor at /r/{slug}
 * has no session, so the slug itself has to name the tenant. Every read here is
 * by slug and by nothing else, and everything after it goes through
 * `withAgency`. See the note in db/rls.sql.
 */

/**
 * `houston-4f8a2c` — readable, and unguessable.
 *
 * The name half is courtesy so a client can tell two links apart. The six hex
 * characters are the security: this URL is the only thing standing between the
 * public and the report, so a sequential id or a bare slugified name would mean
 * anyone could walk the list.
 */
function mintSlug(websiteName: string) {
  const base =
    websiteName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "report";

  return `${base}-${randomBytes(3).toString("hex")}`;
}

export type ShareRow = {
  id: string;
  slug: string;
  enabled: boolean;
  branding: TrackedEventBranding;
  maskIps: boolean;
};

/** The share link for a website, or null if one was never created. */
export async function getShare(agencyId: string, websiteId: string): Promise<ShareRow | null> {
  const [row] = await withAgency(agencyId, (tx) =>
    tx
      .select({
        id: reportShares.id,
        slug: reportShares.slug,
        enabled: reportShares.enabled,
        branding: reportShares.branding,
        maskIps: reportShares.maskIps,
      })
      .from(reportShares)
      // `report_shares` has no tenant policy, so the agency filter is written
      // out by hand here. Every query in this file must do the same.
      .where(and(eq(reportShares.websiteId, websiteId), eq(reportShares.agencyId, agencyId))),
  );

  return row ?? null;
}

/**
 * Create the link, or return the existing one.
 *
 * Idempotent on purpose: pressing "Share" twice must not mint a second URL and
 * silently orphan the one already sent to the client.
 */
export async function ensureShare(
  agencyId: string,
  websiteId: string,
  createdBy: string,
): Promise<ShareRow | null> {
  const existing = await getShare(agencyId, websiteId);
  if (existing) return existing;

  const [site] = await withAgency(agencyId, (tx) =>
    tx
      .select({ id: websites.id, name: websites.name })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1),
  );

  // Scoped read: an id from another agency returns nothing and creates nothing.
  if (!site) return null;

  const [created] = await withAgency(agencyId, (tx) =>
    tx
      .insert(reportShares)
      .values({
        agencyId,
        websiteId,
        slug: mintSlug(site.name),
        createdBy,
      })
      .returning({
        id: reportShares.id,
        slug: reportShares.slug,
        enabled: reportShares.enabled,
        branding: reportShares.branding,
        maskIps: reportShares.maskIps,
      }),
  );

  return created;
}

export type ResolvedShare = {
  agencyId: string;
  websiteId: string;
  branding: TrackedEventBranding;
  maskIps: boolean;
};

/**
 * Resolve a public slug to the tenant it belongs to.
 *
 * Unscoped and filtered by slug alone — this is the lookup the exemption exists
 * for. A disabled link resolves to null rather than to a "this link is off"
 * page: whether a slug ever existed is not something a stranger needs to learn.
 */
export async function resolveShare(slug: string): Promise<ResolvedShare | null> {
  const [row] = await db
    .select({
      agencyId: reportShares.agencyId,
      websiteId: reportShares.websiteId,
      branding: reportShares.branding,
      maskIps: reportShares.maskIps,
      enabled: reportShares.enabled,
    })
    .from(reportShares)
    .where(eq(reportShares.slug, slug))
    .limit(1);

  if (!row || !row.enabled) return null;

  return {
    agencyId: row.agencyId,
    websiteId: row.websiteId,
    branding: row.branding,
    maskIps: row.maskIps,
  };
}
