"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import {
  mergeFloatingFabGroup,
  type FloatingFabGroupSettings,
} from "@/lib/widgets/fab-group";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveFloatingFabGroup(input: {
  websiteId: string;
  clientId: string;
  group: FloatingFabGroupSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const floatingFabGroup = mergeFloatingFabGroup(input.group);

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      floatingFabGroup,
    };

    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));

    return { ok: true as const };
  });

  if (result.ok) {
    const base = `/clients/${input.clientId}/websites/${input.websiteId}`;
    revalidatePath(base);
    revalidatePath(`${base}/accessibility`);
    revalidatePath(`${base}/languages`);
    revalidatePath(`${base}/chat-ai`);
  }
  return result;
}
