"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { mergeErrorLogSettings, type ErrorLogSettings } from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveErrorLog(input: {
  websiteId: string;
  clientId: string;
  settings: ErrorLogSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const errorLog = mergeErrorLogSettings(input.settings);

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      errorLog,
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
    revalidatePath(`${base}/error-log`);
  }
  return result;
}

export async function actionClearErrorLog(input: {
  websiteId: string;
  clientId: string;
  settings: ErrorLogSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = mergeErrorLogSettings(input.settings);
  return actionSaveErrorLog({
    websiteId: input.websiteId,
    clientId: input.clientId,
    settings: mergeErrorLogSettings({ ...base, entries: [] }),
  });
}
