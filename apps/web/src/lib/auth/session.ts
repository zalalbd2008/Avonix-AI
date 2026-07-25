import { and, asc, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db, withAgency } from "@/lib/db";
import { agencies, memberships, user } from "@/lib/db/schema";
import { normalizePlatformLocale } from "@/lib/i18n/platform-languages";
import { readActiveOrgCookie } from "./active-org";
import {
  clearPlatformOrgCookie,
  readPlatformOrgCookie,
} from "./platform-org";

export type ActiveContext = {
  userId: string;
  userName: string;
  userEmail: string;
  /** ISO 639-1 platform UI language for this user. */
  locale: string;
  agencyId: string;
  agencyName: string;
  role: "owner" | "admin" | "member";
  customRoleId: string | null;
  /** `"*"` for owner/admin; otherwise permission keys from the custom role. */
  permissions: string[] | "*";
  /** How many organizations this user belongs to — drives the org switcher. */
  organizationCount: number;
  /**
   * True when a Platform Owner is inside a customer org workspace
   * (not a real membership — ADR-012 access path).
   */
  platformAccess?: boolean;
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

    const { isPlatformOwner } = await import("@/lib/platform/owner");
    if (await isPlatformOwner(session.user.id)) {
      return resolvePlatformOwnerContext(session.user);
    }

    // Step 1 — unscoped, and only ever filtered by userId. Every membership,
    // because a user can belong to more than one organization (ADR-006).
    const rows = await db
      .select({
        agencyId: memberships.agencyId,
        role: memberships.role,
        customRoleId: memberships.customRoleId,
      })
      .from(memberships)
      .where(eq(memberships.userId, session.user.id))
      .orderBy(asc(memberships.createdAt));

    if (rows.length === 0) return null;

    // The cookie only *chooses* among memberships this user already has. An id
    // that is not in this list is ignored rather than trusted — which is the
    // whole security story for organization switching, and the reason the
    // lookup happens here rather than in the switch action alone.
    const preferred = await readActiveOrgCookie();
    const membership = rows.find((r) => r.agencyId === preferred) ?? rows[0];

    // Step 2 — now a tenant exists, so the agency row is readable.
    const [agency] = await withAgency(membership.agencyId, (tx) =>
      tx
        .select({ id: agencies.id, name: agencies.name })
        .from(agencies)
        .where(and(eq(agencies.id, membership.agencyId), isNull(agencies.deletedAt)))
        .limit(1),
    );

    if (!agency) return null; // membership pointing at a deleted agency

    const [userRow] = await db
      .select({ locale: user.locale })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const { permissionsForMembership } = await import("@/lib/team/service");
    const permissions = await permissionsForMembership({
      agencyId: agency.id,
      role: membership.role,
      customRoleId: membership.customRoleId,
    });

    return {
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      locale: normalizePlatformLocale(userRow?.locale),
      agencyId: agency.id,
      agencyName: agency.name,
      role: membership.role,
      customRoleId: membership.customRoleId,
      permissions,
      organizationCount: rows.length,
    };
  },
);

async function resolvePlatformOwnerContext(sessionUser: {
  id: string;
  name: string;
  email: string;
}): Promise<ActiveContext | null> {
  const agencyId = await readPlatformOrgCookie();
  if (!agencyId) return null;

  const [agency] = await withAgency(agencyId, (tx) =>
    tx
      .select({ id: agencies.id, name: agencies.name })
      .from(agencies)
      .where(and(eq(agencies.id, agencyId), isNull(agencies.deletedAt)))
      .limit(1),
  );

  if (!agency) {
    await clearPlatformOrgCookie();
    return null;
  }

  const [userRow] = await db
    .select({ locale: user.locale })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);

  return {
    userId: sessionUser.id,
    userName: sessionUser.name,
    userEmail: sessionUser.email,
    locale: normalizePlatformLocale(userRow?.locale),
    agencyId: agency.id,
    agencyName: agency.name,
    role: "owner",
    customRoleId: null,
    permissions: "*",
    organizationCount: 1,
    platformAccess: true,
  };
}

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
  if (!ctx) {
    const { isPlatformOwner } = await import("@/lib/platform/owner");
    if (await isPlatformOwner(session.user.id)) redirect("/platform");
    redirect("/onboarding/agency");
  }

  // Self-serve orgs must purchase a plan (or be complimentary from Platform Owner).
  // Platform Owner impersonation skips this gate.
  if (!ctx.platformAccess) {
    const { agencyHasPaidAccess } = await import("@/lib/billing/access");
    if (!(await agencyHasPaidAccess(ctx.agencyId))) {
      redirect("/onboarding/billing");
    }
  }

  return ctx;
}

/**
 * Like requireAgency but allows unpaid orgs (billing / checkout completion).
 */
export async function requireAgencyMembership(): Promise<ActiveContext> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const ctx = await getActiveContext();
  if (!ctx) {
    const { isPlatformOwner } = await import("@/lib/platform/owner");
    if (await isPlatformOwner(session.user.id)) redirect("/platform");
    redirect("/onboarding/agency");
  }

  return ctx;
}

/**
 * Guard for `onboarding/`.
 *
 * Signed in is all it asks for — the whole point of onboarding is that there is
 * no agency yet, so requireAgency would send every step back to step two in a
 * loop.
 *
 * Without this the wizard renders happily to a signed-out visitor, who fills in
 * their agency name and only discovers they are not signed in when the server
 * action refuses. Failing at the door beats failing at the end.
 */
export async function requireUser(): Promise<{
  userId: string;
  userEmail: string;
  userName: string | null;
  emailVerified: boolean;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  return {
    userId: session.user.id,
    userEmail: session.user.email,
    userName: session.user.name,
    emailVerified: Boolean(session.user.emailVerified),
  };
}

/**
 * Onboarding steps after "verify email" — agency, client, website, plugin.
 * Unverified users are sent back to confirm their address first.
 */
export async function requireVerifiedUser(): Promise<{
  userId: string;
  userEmail: string;
  userName: string | null;
}> {
  const user = await requireUser();
  if (!user.emailVerified) redirect("/onboarding/verify-email");
  return {
    userId: user.userId,
    userEmail: user.userEmail,
    userName: user.userName,
  };
}

/**
 * Guard for `/platform/*` — Platform Owner only (ADR-012).
 * Not an agency membership check; separate from Organization overview (`/super-admin`).
 */
export async function requirePlatformOwner(): Promise<{
  userId: string;
  userEmail: string;
  userName: string | null;
  userImage: string | null;
}> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const { isPlatformOwner } = await import("@/lib/platform/owner");
  const ok = await isPlatformOwner(session.user.id);
  if (!ok) redirect("/dashboard");

  const [profile] = await db
    .select({ image: user.image, name: user.name })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  return {
    userId: session.user.id,
    userEmail: session.user.email,
    userName: profile?.name ?? session.user.name ?? null,
    userImage: profile?.image ?? null,
  };
}
