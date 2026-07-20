"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { createClientForAgency, type CreateClientResult } from "./service";

/**
 * Server action wrapper: resolve the tenant, hand off to the service, refresh
 * the lists that now have one more row.
 */
export async function createClient(
  formData: FormData,
): Promise<CreateClientResult> {
  const ctx = await requireAgency();

  try {
    const result = await createClientForAgency(ctx.agencyId, {
      name: String(formData.get("name") ?? ""),
      contactEmail: String(formData.get("contactEmail") ?? ""),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    });

    if (result.ok) {
      revalidatePath("/clients");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (e) {
    console.error("createClient failed", e);
    return { ok: false, error: "Could not create the client. Try again." };
  }
}
