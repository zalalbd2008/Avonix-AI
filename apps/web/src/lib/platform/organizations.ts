/**
 * Cross-tenant organization inventory for Platform Owners (ADR-012 / ADR-013).
 */
import "server-only";

import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { adminDb } from "@/lib/db/admin";
import {
  agencies,
  clients,
  memberships,
  user,
  websites,
} from "@/lib/db/schema";
import { mergeBillingOverrides } from "@/lib/billing/profile";
import type {
  PlatformOrganization,
  PlatformOrganizationStats,
} from "@/lib/platform/types";

export type { PlatformOrganization, PlatformOrganizationStats };

/**
 * Coerce legacy trial rows to active (no trial product).
 * Idempotent — safe to call from Platform Owner surfaces.
 */
export async function ensureNoFreeOrTrialPlans() {
  await adminDb.execute(sql`
    UPDATE agencies
    SET
      status = CASE WHEN status = 'trialing' THEN 'active' ELSE status END,
      trial_ends_at = NULL,
      updated_at = now()
    WHERE deleted_at IS NULL
      AND (status = 'trialing' OR trial_ends_at IS NOT NULL)
  `);
}

function normalizeStatus(
  status: "trialing" | "active" | "past_due" | "canceled",
): PlatformOrganization["status"] {
  if (status === "trialing") return "active";
  return status;
}

/** Every non-deleted customer organization on the platform. */
export const listPlatformOrganizations = cache(
  async (): Promise<PlatformOrganization[]> => {
    const rows = await adminDb
      .select({
        id: agencies.id,
        name: agencies.name,
        slug: agencies.slug,
        plan: agencies.plan,
        status: agencies.status,
        createdAt: agencies.createdAt,
        billingOverrides: agencies.billingOverrides,
      })
      .from(agencies)
      .where(isNull(agencies.deletedAt))
      .orderBy(asc(agencies.name));

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);

    const [clientCounts, websiteCounts, memberCounts, owners] =
      await Promise.all([
        adminDb
          .select({
            agencyId: clients.agencyId,
            n: count(),
          })
          .from(clients)
          .where(and(inArray(clients.agencyId, ids), isNull(clients.deletedAt)))
          .groupBy(clients.agencyId),
        adminDb
          .select({
            agencyId: websites.agencyId,
            n: count(),
          })
          .from(websites)
          .where(
            and(inArray(websites.agencyId, ids), isNull(websites.deletedAt)),
          )
          .groupBy(websites.agencyId),
        adminDb
          .select({
            agencyId: memberships.agencyId,
            n: count(),
          })
          .from(memberships)
          .where(inArray(memberships.agencyId, ids))
          .groupBy(memberships.agencyId),
        adminDb
          .select({
            agencyId: memberships.agencyId,
            email: user.email,
            name: user.name,
          })
          .from(memberships)
          .innerJoin(user, eq(user.id, memberships.userId))
          .where(
            and(
              inArray(memberships.agencyId, ids),
              eq(memberships.role, "owner"),
            ),
          )
          .orderBy(asc(memberships.createdAt)),
      ]);

    const clientMap = new Map(clientCounts.map((r) => [r.agencyId, r.n]));
    const websiteMap = new Map(websiteCounts.map((r) => [r.agencyId, r.n]));
    const memberMap = new Map(memberCounts.map((r) => [r.agencyId, r.n]));
    const ownerMap = new Map<string, { email: string; name: string }>();
    for (const o of owners) {
      if (!ownerMap.has(o.agencyId)) {
        ownerMap.set(o.agencyId, { email: o.email, name: o.name });
      }
    }

    return rows.map((r) => {
      const owner = ownerMap.get(r.id);
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        plan: r.plan,
        status: normalizeStatus(r.status),
        createdAt: r.createdAt,
        clients: clientMap.get(r.id) ?? 0,
        websites: websiteMap.get(r.id) ?? 0,
        members: memberMap.get(r.id) ?? 0,
        ownerEmail: owner?.email ?? null,
        ownerName: owner?.name ?? null,
        overrides: mergeBillingOverrides(r.billingOverrides),
      };
    });
  },
);

export async function getPlatformOrganizationStats(
  orgs: PlatformOrganization[],
): Promise<PlatformOrganizationStats> {
  const stats: PlatformOrganizationStats = {
    total: orgs.length,
    active: 0,
    pastDue: 0,
    canceled: 0,
    starter: 0,
    professional: 0,
    agency: 0,
    enterprise: 0,
  };
  for (const o of orgs) {
    if (o.status === "active") stats.active += 1;
    else if (o.status === "past_due") stats.pastDue += 1;
    else if (o.status === "canceled") stats.canceled += 1;
    stats[o.plan] += 1;
  }
  return stats;
}

export async function getPlatformOrganization(
  agencyId: string,
): Promise<PlatformOrganization | null> {
  const orgs = await listPlatformOrganizations();
  return orgs.find((o) => o.id === agencyId) ?? null;
}

/** Lightweight existence check without loading the full inventory. */
export async function platformOrganizationExists(
  agencyId: string,
): Promise<boolean> {
  const [row] = await adminDb
    .select({ id: agencies.id })
    .from(agencies)
    .where(and(eq(agencies.id, agencyId), isNull(agencies.deletedAt)))
    .limit(1);
  return Boolean(row);
}

export async function countPlatformOrganizations(): Promise<number> {
  const [row] = await adminDb
    .select({ n: count() })
    .from(agencies)
    .where(isNull(agencies.deletedAt));
  return row?.n ?? 0;
}

/** Used by platform home dashboard metrics. */
export async function countAgenciesByStatus() {
  const rows = await adminDb
    .select({
      status: agencies.status,
      n: count(),
    })
    .from(agencies)
    .where(isNull(agencies.deletedAt))
    .groupBy(agencies.status);
  return rows;
}
