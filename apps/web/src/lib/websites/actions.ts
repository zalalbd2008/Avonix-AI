"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import {
  createWebsiteForClient,
  rotateConnectorKey,
  updateWebsiteUrlForClient,
  type CreateWebsiteResult,
} from "./service";
import { hardDeleteWebsite } from "@/lib/delete/entities";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

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
      revalidatePath("/launchpad");
      revalidatePath("/dashboard");
    }
    return result;
  } catch (e) {
    console.error("createWebsite failed", e);
    return { ok: false, error: "Could not add the website. Try again." };
  }
}

export async function updateWebsiteUrl(
  websiteId: string,
  clientId: string,
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  try {
    const result = await updateWebsiteUrlForClient(
      ctx.agencyId,
      websiteId,
      String(formData.get("url") ?? ""),
    );
    if (result.ok) {
      revalidatePath(`/clients/${clientId}/websites/${websiteId}`);
      revalidatePath(`/clients/${clientId}/websites/${websiteId}/settings`);
      revalidatePath("/websites");
      revalidatePath("/launchpad");
    }
    return result;
  } catch (e) {
    console.error("updateWebsiteUrl failed", e);
    return { ok: false, error: "Could not update the URL. Try again." };
  }
}

export async function deleteWebsite(websiteId: string, clientId: string) {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false as const,
      error: "You do not have permission to delete websites.",
    };
  }

  const result = await hardDeleteWebsite(ctx.agencyId, websiteId);
  if (!result.ok) return result;

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/${clientId}/websites`);
  revalidatePath("/websites");
  revalidatePath("/launchpad");
  revalidatePath("/dashboard");
  return { ok: true as const };
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
