import { and, asc, count, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { db, withAgency } from "@/lib/db";
import { agencies, clients, memberships, websites } from "@/lib/db/schema";
import type { Agency } from "@/lib/db/schema";

export type Organization = {
  id: string;
  name: string;
  plan: Agency["plan"];
  status: string;
  role: "owner" | "admin" | "member";
  clients: number;
  websites: number;
};

/**
 * Every organization this user belongs to, with its real counts.
 *
 * One `withAgency` call per organization rather than a single query with an
 * `IN (…)`. That is N round trips, and it is the point: row-level security
 * scopes a transaction to exactly one tenant, so a query spanning several would
 * either return nothing or need the policy relaxed. N is the number of
 * organizations one person belongs to — small, and if it ever is not, that is a
 * paging problem rather than a reason to weaken isolation.
 */
export const listOrganizations = cache(async (userId: string): Promise<Organization[]> => {
  // Unscoped and filtered by userId only — `memberships` is the table that
  // decides the tenant, so it cannot be scoped by one.
  const rows = await db
    .select({ agencyId: memberships.agencyId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt));

  const out: Organization[] = [];

  for (const row of rows) {
    const org = await withAgency(row.agencyId, async (tx) => {
      const [[agency], [clientCount], [websiteCount]] = await Promise.all([
        tx
          .select({
            name: agencies.name,
            plan: agencies.plan,
            status: agencies.status,
            deletedAt: agencies.deletedAt,
          })
          .from(agencies)
          .where(eq(agencies.id, row.agencyId))
          .limit(1),
        tx
          .select({ n: count() })
          .from(clients)
          .where(isNull(clients.deletedAt)),
        tx
          .select({ n: count() })
          .from(websites)
          .where(isNull(websites.deletedAt)),
      ]);

      // A membership can outlive the agency it points at.
      if (!agency || agency.deletedAt) return null;

      return {
        id: row.agencyId,
        name: agency.name,
        plan: agency.plan,
        status: agency.status,
        role: row.role,
        clients: clientCount.n,
        websites: websiteCount.n,
      };
    });

    if (org) out.push(org);
  }

  return out;
});

/** Whether this user may act as this organization. */
export async function isMemberOf(userId: string, agencyId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.agencyId, agencyId)))
    .limit(1);

  return Boolean(row);
}
