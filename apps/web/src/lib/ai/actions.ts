"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { indexWebsite } from "./index-site";

export async function reindexWebsite(clientId: string, websiteId: string) {
  const ctx = await requireAgency();
  try {
    const result = await indexWebsite(ctx.agencyId, websiteId);
    if (result.ok) {
      revalidatePath(`/clients/${clientId}/websites/${websiteId}/knowledge`);
    }
    return result;
  } catch (e) {
    console.error("reindexWebsite failed", e);
    return { ok: false as const, error: "Indexing failed. Try again." };
  }
}
