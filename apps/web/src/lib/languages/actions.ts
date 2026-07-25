"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { mergeLanguageSettings, type LanguageSettings } from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveLanguages(input: {
  websiteId: string;
  clientId: string;
  settings: LanguageSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const languages = mergeLanguageSettings(input.settings);

  // Keep default/fallback pointing at an enabled locale when possible.
  const enabledCodes = new Set(
    languages.locales.filter((l) => l.enabled).map((l) => l.code),
  );
  if (!enabledCodes.has(languages.defaultLocale) && enabledCodes.size) {
    languages.defaultLocale = [...enabledCodes][0]!;
  }
  if (!enabledCodes.has(languages.fallbackLocale) && enabledCodes.size) {
    languages.fallbackLocale = languages.defaultLocale;
  }

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      languages,
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
    revalidatePath(`${base}/languages`);
  }
  return result;
}
