"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { CONNECTOR_VERSION } from "@/lib/connector/version";
import { pushUpdateTriggerToSite } from "./trigger-site";
import {
  makePendingAction,
  mergeUpdatesSettings,
  type UpdateActionKind,
  type UpdateInventoryItem,
  type UpdatesSettings,
} from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveUpdates(input: {
  websiteId: string;
  clientId: string;
  settings: UpdatesSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const updates = mergeUpdatesSettings(input.settings);

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      updates,
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
    revalidatePath(`${base}/updates`);
  }
  return result;
}

export async function actionQueueSoftwareUpdate(input: {
  websiteId: string;
  clientId: string;
  kind: UpdateActionKind;
  item: Pick<UpdateInventoryItem, "targetType" | "slug" | "name">;
}): Promise<
  | { ok: true; pushed: boolean; warning?: string }
  | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const site = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({
        id: websites.id,
        url: websites.url,
        settings: websites.settings,
        status: websites.status,
      })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site) return { ok: false, error: "Website not found." };

  const updates = mergeUpdatesSettings(site.settings?.updates);
  const action = makePendingAction({
    kind: input.kind,
    targetType: input.item.targetType,
    slug: input.item.slug,
    label:
      input.item.targetType === "connector" && input.kind === "update"
        ? `Avonix connector → v${CONNECTOR_VERSION}`
        : input.item.name,
  });

  const nextUpdates = mergeUpdatesSettings({
    ...updates,
    pendingActions: [action, ...updates.pendingActions].slice(0, 50),
  });

  await withAgency(ctx.agencyId, async (tx) => {
    const next: WebsiteSettings = {
      ...(site.settings ?? {}),
      updates: nextUpdates,
    };
    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));
  });

  let pushed = false;
  let warning: string | undefined;
  if (site.status === "connected" && site.url) {
    const wake = await pushUpdateTriggerToSite({
      siteUrl: site.url,
      websiteId: input.websiteId,
      jobId: action.id,
    });
    pushed = wake.ok;
    if (!wake.ok) warning = wake.error;
  } else {
    warning = "Connector not connected — job queued for the next poll.";
  }

  const base = `/clients/${input.clientId}/websites/${input.websiteId}`;
  revalidatePath(base);
  revalidatePath(`${base}/updates`);

  return { ok: true, pushed, warning };
}

/**
 * Queue a connector self-update and wake the site immediately when possible.
 */
export async function actionPushConnectorUpdate(input: {
  websiteId: string;
  clientId: string;
}): Promise<
  | { ok: true; queued: true; pushed: boolean; warning?: string }
  | { ok: false; error: string }
> {
  const res = await actionQueueSoftwareUpdate({
    websiteId: input.websiteId,
    clientId: input.clientId,
    kind: "update",
    item: {
      targetType: "connector",
      slug: "avonix-connector",
      name: "Avonix connector",
    },
  });
  if (!res.ok) return res;
  return {
    ok: true,
    queued: true,
    pushed: res.pushed,
    warning: res.warning,
  };
}
