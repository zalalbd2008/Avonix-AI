"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import {
  createWebsiteForClient,
  rotateConnectorKey,
  type CreateWebsiteResult,
} from "./service";

export async function createWebsite(
  clientId: string,
  formData: FormData,
): Promise<CreateWebsiteResult> {
  const ctx = await requireAgency();
  try {
    const result = await createWebsiteForClient(ctx.agencyId, clientId, {
      name: String(formData.get("name") ?? ""),
      url: String(formData.get("url") ?? ""),
    });
    if (result.ok) {
      revalidatePath(`/clients/${clientId}`);
      revalidatePath("/websites");
    }
    return result;
  } catch (e) {
    console.error("createWebsite failed", e);
    return { ok: false, error: "Could not add the website. Try again." };
  }
}

export async function rotateKey(websiteId: string) {
  const ctx = await requireAgency();
  try {
    return await rotateConnectorKey(ctx.agencyId, websiteId);
  } catch (e) {
    console.error("rotateKey failed", e);
    return { ok: false as const, error: "Could not rotate the key." };
  }
}
