import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { db, withAgency } from "@/lib/db";
import {
  agencies,
  clients,
  connectorKeys,
  memberships,
  pluginUninstallTokens,
  user,
  verification,
  websites,
} from "@/lib/db/schema";
import { isPlatformOwner } from "@/lib/platform/owner";

const UNINSTALL_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

/** Queue self-uninstall for every active connector key, then hard-delete. */
async function queueUninstallTokens(hashes: string[]) {
  if (!hashes.length) return;
  const expiresAt = new Date(Date.now() + UNINSTALL_TTL_MS);
  await db
    .insert(pluginUninstallTokens)
    .values(hashes.map((secretHash) => ({ secretHash, expiresAt })))
    .onConflictDoNothing({ target: pluginUninstallTokens.secretHash });
}

async function activeKeyHashesForWebsites(
  agencyId: string,
  websiteIds: string[],
): Promise<string[]> {
  if (!websiteIds.length) return [];
  return withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({ hash: connectorKeys.secretHash })
      .from(connectorKeys)
      .where(
        and(
          inArray(connectorKeys.websiteId, websiteIds),
          isNull(connectorKeys.revokedAt),
        ),
      );
    return rows.map((r) => r.hash);
  });
}

/**
 * Hard-delete a website from the database and queue plugin self-uninstall.
 */
export async function hardDeleteWebsite(
  agencyId: string,
  websiteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const hashes = await activeKeyHashesForWebsites(agencyId, [websiteId]);
  await queueUninstallTokens(hashes);

  return withAgency(agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    if (!site) return { ok: false as const, error: "Website not found." };

    await tx.delete(websites).where(eq(websites.id, websiteId));
    return { ok: true as const };
  });
}

/**
 * Hard-delete a client (cascades websites via FK) and queue plugin uninstalls.
 */
export async function hardDeleteClient(
  agencyId: string,
  clientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const websiteIds = await withAgency(agencyId, async (tx) => {
    const rows = await tx
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.clientId, clientId));
    return rows.map((r) => r.id);
  });
  const hashes = await activeKeyHashesForWebsites(agencyId, websiteIds);
  await queueUninstallTokens(hashes);

  return withAgency(agencyId, async (tx) => {
    const [client] = await tx
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (!client) return { ok: false as const, error: "Client not found." };

    await tx.delete(clients).where(eq(clients.id, clientId));
    return { ok: true as const };
  });
}

/**
 * After an org is wiped, permanently remove member login accounts that no
 * longer belong to any organization (and are not Platform Owners). Sessions,
 * credentials, and email verification rows go with them — the email can be
 * reused for a fresh signup.
 */
export async function purgeOrphanedOrgMembers(
  candidateUserIds: string[],
): Promise<string[]> {
  const unique = [...new Set(candidateUserIds.filter(Boolean))];
  const purged: string[] = [];

  for (const userId of unique) {
    if (await isPlatformOwner(userId)) continue;

    const [stillMember] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.userId, userId))
      .limit(1);
    if (stillMember) continue;

    const [row] = await db
      .select({ email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    if (!row) continue;

    await db.delete(user).where(eq(user.id, userId));
    await db
      .delete(verification)
      .where(eq(verification.identifier, row.email));
    purged.push(userId);
  }

  return purged;
}

async function memberUserIdsForAgency(agencyId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: memberships.userId })
    .from(memberships)
    .where(eq(memberships.agencyId, agencyId));
  return rows.map((r) => r.userId);
}

/**
 * Permanently delete an organization. Owner only.
 *
 * Hard-deletes the tenant (clients, websites, forms, invites, memberships —
 * all cascade) and then removes orphaned member login accounts so the email
 * is free again. Stripe billing history stays in Stripe.
 */
export async function hardDeleteOrganization(opts: {
  agencyId: string;
  userId: string;
}): Promise<
  | { ok: true; purgedUserIds: string[]; accountDeleted: boolean }
  | { ok: false; error: string }
> {
  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, opts.userId),
        eq(memberships.agencyId, opts.agencyId),
      ),
    )
    .limit(1);

  if (!membership) {
    return { ok: false, error: "You are not a member of that organization." };
  }
  if (membership.role !== "owner") {
    return {
      ok: false,
      error: "Only the organization owner can delete it.",
    };
  }

  const memberIds = await memberUserIdsForAgency(opts.agencyId);

  const hashes = await withAgency(opts.agencyId, async (tx) => {
    const rows = await tx
      .select({ hash: connectorKeys.secretHash })
      .from(connectorKeys)
      .where(
        and(
          eq(connectorKeys.agencyId, opts.agencyId),
          isNull(connectorKeys.revokedAt),
        ),
      );
    return rows.map((r) => r.hash);
  });

  await queueUninstallTokens(hashes);

  const [agency] = await withAgency(opts.agencyId, (tx) =>
    tx
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.id, opts.agencyId))
      .limit(1),
  );
  if (!agency) {
    return { ok: false, error: "Organization not found." };
  }

  await withAgency(opts.agencyId, (tx) =>
    tx.delete(agencies).where(eq(agencies.id, opts.agencyId)),
  );

  const purgedUserIds = await purgeOrphanedOrgMembers(memberIds);
  return {
    ok: true,
    purgedUserIds,
    accountDeleted: purgedUserIds.includes(opts.userId),
  };
}

/** True when this key hash was queued for plugin self-uninstall. */
export async function consumeUninstallToken(secretHash: string): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .select({ id: pluginUninstallTokens.id })
    .from(pluginUninstallTokens)
    .where(
      and(
        eq(pluginUninstallTokens.secretHash, secretHash),
        gt(pluginUninstallTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) return false;

  await db
    .delete(pluginUninstallTokens)
    .where(eq(pluginUninstallTokens.id, row.id));
  return true;
}

export async function hasUninstallToken(secretHash: string): Promise<boolean> {
  const now = new Date();
  const [row] = await db
    .select({ id: pluginUninstallTokens.id })
    .from(pluginUninstallTokens)
    .where(
      and(
        eq(pluginUninstallTokens.secretHash, secretHash),
        gt(pluginUninstallTokens.expiresAt, now),
      ),
    )
    .limit(1);
  return Boolean(row);
}
