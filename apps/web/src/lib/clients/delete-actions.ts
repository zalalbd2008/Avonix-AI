"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { hardDeleteClient } from "@/lib/delete/entities";

function canEditClients(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("clients.edit");
}

export async function deleteClient(clientId: string) {
  const ctx = await requireAgency();
  if (!canEditClients(ctx.permissions)) {
    return {
      ok: false as const,
      error: "You do not have permission to delete clients.",
    };
  }

  const result = await hardDeleteClient(ctx.agencyId, clientId);
  if (!result.ok) return result;

  revalidatePath("/clients");
  revalidatePath("/websites");
  revalidatePath("/launchpad");
  revalidatePath("/dashboard");
  revalidatePath("/organizations");
  return { ok: true as const };
}
