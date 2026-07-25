"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { writeActiveOrgCookie } from "@/lib/auth/active-org";
import { isMemberOf } from "./organizations";

/**
 * Switch which organization the caller is acting as.
 *
 * The membership check is the entire security boundary of this feature. Without
 * it, setting a cookie to any uuid would adopt that tenant and row-level
 * security would happily serve someone else's data — RLS enforces the tenant it
 * is *given*, it cannot know whether you were entitled to give it.
 *
 * `getActiveContext` re-checks on every request as well. Two checks for one
 * rule is deliberate: this one gives an honest error now, that one means a
 * membership revoked after the switch stops working immediately.
 */
export async function switchOrganization(agencyId: string) {
  const user = await requireUser();

  if (!(await isMemberOf(user.userId, agencyId))) {
    return { ok: false as const, error: "You are not a member of that organization." };
  }

  await writeActiveOrgCookie(agencyId);

  // Everything under the app is scoped to the tenant that just changed.
  revalidatePath("/", "layout");

  return { ok: true as const };
}
