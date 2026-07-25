import { and, count, eq, isNull } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { agencies, connectorKeys, websites } from "@/lib/db/schema";
import { generateConnectorKey } from "@/lib/connector/keys";
import { effectivePlanLimits } from "@/lib/plans";
import { mergeBillingOverrides } from "@/lib/billing/profile";
import { parseWebsiteUrl, WEBSITE_URL_ERROR } from "./url";

export type CreateWebsiteResult =
  | { ok: true; websiteId: string; connectorKey: string }
  | { ok: false; error: string };

/**
 * Register a website and issue its connector key.
 *
 * The plaintext key is returned exactly once, here. Only its hash is stored, so
 * there is no way to show it again later — the recovery path is rotation.
 */
export async function createWebsiteForClient(
  agencyId: string,
  clientId: string,
  input: { name: string; url: string },
): Promise<CreateWebsiteResult> {
  const name = input.name.trim();
  const url = parseWebsiteUrl(input.url);

  if (name.length < 2) return { ok: false, error: "Give the website a name." };
  if (!url) return { ok: false, error: WEBSITE_URL_ERROR };

  return withAgency(agencyId, async (tx) => {
    // Confirms the client belongs to this agency: under RLS a client id from
    // another agency simply is not here.
    const [[agency], [existing]] = await Promise.all([
      tx
        .select({
          plan: agencies.plan,
          billingOverrides: agencies.billingOverrides,
        })
        .from(agencies)
        .where(eq(agencies.id, agencyId))
        .limit(1),
      tx
        .select({ n: count() })
        .from(websites)
        .where(and(eq(websites.clientId, clientId), isNull(websites.deletedAt))),
    ]);

    const limits = effectivePlanLimits(
      agency.plan,
      mergeBillingOverrides(agency.billingOverrides),
    );
    if (existing.n >= limits.maxWebsitesPerClient) {
      return {
        ok: false as const,
        error: Number.isFinite(limits.maxWebsitesPerClient)
          ? `This organization allows ${limits.maxWebsitesPerClient} website${limits.maxWebsitesPerClient === 1 ? "" : "s"} per client.`
          : `Website limit reached.`,
      };
    }

    const [site] = await tx
      .insert(websites)
      .values({ agencyId, clientId, name, url, status: "pending" })
      .returning({ id: websites.id });

    const generated = generateConnectorKey();
    await tx.insert(connectorKeys).values({
      agencyId,
      clientId,
      websiteId: site.id,
      secretHash: generated.hash,
      prefix: generated.prefix,
    });

    return { ok: true as const, websiteId: site.id, connectorKey: generated.key };
  });
}

/** Update the registered address — must pass the same URL rules as create. */
export async function updateWebsiteUrlForClient(
  agencyId: string,
  websiteId: string,
  rawUrl: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const url = parseWebsiteUrl(rawUrl);
  if (!url) return { ok: false, error: WEBSITE_URL_ERROR };

  return withAgency(agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    if (!site) return { ok: false as const, error: "Website not found." };

    await tx
      .update(websites)
      .set({ url, updatedAt: new Date() })
      .where(eq(websites.id, websiteId));

    return { ok: true as const, url };
  });
}

/**
 * Issue a new key and revoke the old ones.
 *
 * Revoked rather than deleted, so "when did this key stop working" stays
 * answerable after an incident.
 */
export async function rotateConnectorKey(
  agencyId: string,
  websiteId: string,
): Promise<{ ok: true; connectorKey: string } | { ok: false; error: string }> {
  return withAgency(agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id, clientId: websites.clientId })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!site) return { ok: false as const, error: "Website not found." };

    await tx
      .update(connectorKeys)
      .set({ revokedAt: new Date() })
      .where(and(eq(connectorKeys.websiteId, websiteId), isNull(connectorKeys.revokedAt)));

    const generated = generateConnectorKey();
    await tx.insert(connectorKeys).values({
      agencyId,
      clientId: site.clientId,
      websiteId,
      secretHash: generated.hash,
      prefix: generated.prefix,
    });

    // The old plugin will now fail to authenticate, so the site is no longer
    // connected until the new key is installed. Saying so beats showing a green
    // dot that is a lie.
    await tx
      .update(websites)
      .set({ status: "pending", updatedAt: new Date() })
      .where(eq(websites.id, websiteId));

    return { ok: true as const, connectorKey: generated.key };
  });
}
