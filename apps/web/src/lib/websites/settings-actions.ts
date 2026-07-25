"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings, type WebsiteFontSettings } from "@/lib/db/schema";

export async function actionSaveWebsiteFonts(input: {
  websiteId: string;
  clientId: string;
  fonts: WebsiteFontSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  const fonts: WebsiteFontSettings = {
    primaryFamily: input.fonts.primaryFamily?.trim() || "system",
    headingFamily: input.fonts.headingFamily?.trim() || undefined,
    weights: input.fonts.weights?.length
      ? input.fonts.weights
      : [400, 500, 600, 700],
  };

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      fonts,
    };

    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));

    return { ok: true as const };
  });

  if (result.ok) {
    revalidatePath(
      `/clients/${input.clientId}/websites/${input.websiteId}/settings`,
    );
  }
  return result;
}
