"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import {
  mergeSecuritySettings,
  newSecurityScanId,
  type SecuritySettings,
} from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveSecurity(input: {
  websiteId: string;
  clientId: string;
  settings: SecuritySettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const security = mergeSecuritySettings(input.settings);

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      security,
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
    revalidatePath(`${base}/security`);
  }
  return result;
}

export async function actionQueueSecurityScan(input: {
  websiteId: string;
  clientId: string;
  settings: SecuritySettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = mergeSecuritySettings(input.settings);
  const entry = {
    id: newSecurityScanId(),
    label: new Date().toLocaleString(),
    detail: "Full malware + integrity scan queued for connector",
    status: "pending" as const,
    filesChecked: 0,
    createdAt: new Date().toISOString(),
  };

  const next = mergeSecuritySettings({
    ...base,
    enabled: true,
    scans: [entry, ...base.scans].slice(0, 50),
  });

  return actionSaveSecurity({
    websiteId: input.websiteId,
    clientId: input.clientId,
    settings: next,
  });
}
