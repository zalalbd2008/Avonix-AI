"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import {
  mergeInsightsSettings,
  type InsightUserStatus,
  type InsightsSettings,
} from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSetInsightStatus(input: {
  websiteId: string;
  clientId: string;
  insightId: string;
  status: InsightUserStatus;
  settings: InsightsSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const base = mergeInsightsSettings(input.settings);
  const next: InsightsSettings = {
    ...base,
    itemStates: {
      ...(base.itemStates ?? {}),
      [input.insightId]: {
        status: input.status,
        at: new Date().toISOString(),
      },
    },
  };

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const settings: WebsiteSettings = {
      ...(row.settings ?? {}),
      insights: next,
    };

    await tx
      .update(websites)
      .set({ settings, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));

    return { ok: true as const };
  });

  if (result.ok) {
    const path = `/clients/${input.clientId}/websites/${input.websiteId}`;
    revalidatePath(path);
    revalidatePath(`${path}/insights`);
  }
  return result;
}

export async function actionRefreshInsights(input: {
  websiteId: string;
  clientId: string;
  settings: InsightsSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const next = mergeInsightsSettings({
    ...input.settings,
    lastRefreshedAt: new Date().toISOString(),
  });

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const settings: WebsiteSettings = {
      ...(row.settings ?? {}),
      insights: next,
    };

    await tx
      .update(websites)
      .set({ settings, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));

    return { ok: true as const };
  });

  if (result.ok) {
    const path = `/clients/${input.clientId}/websites/${input.websiteId}`;
    revalidatePath(path);
    revalidatePath(`${path}/insights`);
  }
  return result;
}
