"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAgency, requireUser } from "@/lib/auth/session";
import {
  clearActiveOrgCookie,
  readActiveOrgCookie,
} from "@/lib/auth/active-org";
import { hardDeleteOrganization } from "@/lib/delete/entities";

export async function deleteOrganization(agencyId: string) {
  const user = await requireUser();
  const result = await hardDeleteOrganization({
    agencyId,
    userId: user.userId,
  });
  if (!result.ok) return result;

  const active = await readActiveOrgCookie();
  if (active === agencyId) {
    await clearActiveOrgCookie();
  }

  if (result.accountDeleted) {
    await auth.api.signOut({ headers: await headers() });
  }

  revalidatePath("/", "layout");
  return {
    ok: true as const,
    accountDeleted: result.accountDeleted,
  };
}

export async function deleteCurrentOrganization() {
  const ctx = await requireAgency();
  if (ctx.role !== "owner") {
    return {
      ok: false as const,
      error: "Only the organization owner can delete it.",
    };
  }
  return deleteOrganization(ctx.agencyId);
}
