/**
 * Post-login home (ADR-013).
 *
 * One sign-in page; destination depends on identity — never on a form field.
 */
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { memberships } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { readPlatformOrgCookie } from "@/lib/auth/platform-org";
import { isPlatformOwner } from "@/lib/platform/owner";

export type PostLoginPath =
  | "/platform"
  | "/dashboard"
  | "/onboarding/agency"
  | "/onboarding/verify-email"
  | "/sign-in";

/**
 * Resolve where a signed-in user should land.
 *
 * Priority:
 * 1. Signed out → sign-in
 * 2. Unverified email → verify
 * 3. Active Platform Owner with org access → workspace dashboard
 * 4. Active Platform Owner → platform dashboard
 * 5. Has organization membership → workspace dashboard
 * 6. Else → create organization (onboarding)
 */
export async function resolvePostLoginPath(
  userId?: string,
  emailVerified?: boolean,
): Promise<PostLoginPath> {
  let id = userId;
  let verified = emailVerified;

  if (!id) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return "/sign-in";
    id = session.user.id;
    verified = Boolean(session.user.emailVerified);
  }

  if (verified === false) return "/onboarding/verify-email";

  if (await isPlatformOwner(id)) {
    const actAs = await readPlatformOrgCookie();
    if (actAs) return "/dashboard";
    return "/platform";
  }

  const [membership] = await db
    .select({ agencyId: memberships.agencyId })
    .from(memberships)
    .where(eq(memberships.userId, id))
    .limit(1);

  if (membership) return "/dashboard";
  return "/onboarding/agency";
}
