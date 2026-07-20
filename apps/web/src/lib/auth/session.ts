import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db, withAgency } from "@/lib/db";
import { agencies, memberships } from "@/lib/db/schema";

export type ActiveContext = {
  userId: string;
  userName: string;
  userEmail: string;
  agencyId: string;
  agencyName: string;
  role: "owner" | "admin" | "member";
};

/**
 * Resolve who is signed in and which agency they are acting as.
 *
 * This is the *only* place a tenant is chosen. Every data read afterwards goes
 * through `withAgency(ctx.agencyId, …)`, and row-level security enforces the
 * rest — ADR-002.
 *
 * THE TWO STEPS ARE NOT OPTIONAL. `memberships` is exempt from RLS (it is what
 * decides the tenant, so scoping it would be circular) but `agencies` is not.
 * Joining them in one query silently returns zero rows: the join touches
 * `agencies` while no tenant is set, the policy filters it out, and the user
 * appears to have no agency at all. Read the membership first, then adopt that
 * tenant before reading anything else.
 *
 * `cache()` dedupes within one render pass, so a layout and the page it wraps
 * share a single lookup.
 */
export const getActiveContext = cache(
  async (): Promise<ActiveContext | null> => {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;

    // Step 1 — unscoped, and only ever filtered by userId.
    const [membership] = await db
      .select({ agencyId: memberships.agencyId, role: memberships.role })
      .from(memberships)
      .where(eq(memberships.userId, session.user.id))
      .limit(1);

    if (!membership) return null;

    // Step 2 — now a tenant exists, so the agency row is readable.
    const [agency] = await withAgency(membership.agencyId, (tx) =>
      tx
        .select({ id: agencies.id, name: agencies.name })
        .from(agencies)
        .where(and(eq(agencies.id, membership.agencyId), isNull(agencies.deletedAt)))
        .limit(1),
    );

    if (!agency) return null; // membership pointing at a deleted agency

    return {
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      agencyId: agency.id,
      agencyName: agency.name,
      role: membership.role,
    };
  },
);

/**
 * Guard for everything under `(app)/`.
 *
 * Signed out → sign-in. Signed in with no agency yet → onboarding. Anything that
 * reaches past this line has a tenant.
 */
export async function requireAgency(): Promise<ActiveContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const ctx = await getActiveContext();
  if (!ctx) redirect("/onboarding/agency");

  return ctx;
}
