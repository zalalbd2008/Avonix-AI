"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import {
  canConnectConnection,
  mergeIntegrationsSettings,
  optionalMeta,
  type IntegrationsSettings,
  type OptionalIntegrationId,
} from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveIntegrations(input: {
  websiteId: string;
  clientId: string;
  settings: IntegrationsSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const integrations = mergeIntegrationsSettings(input.settings);

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      integrations,
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
    revalidatePath(`${base}/integrations`);
  }
  return result;
}

export async function actionConnectIntegration(input: {
  websiteId: string;
  clientId: string;
  id: OptionalIntegrationId;
  settings: IntegrationsSettings;
  label?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const meta = optionalMeta(input.id);
  const base = mergeIntegrationsSettings(input.settings);
  const conn = base.connections.find((c) => c.id === input.id);
  if (!conn) return { ok: false, error: "Unknown integration." };

  if (!canConnectConnection(meta, conn)) {
    return {
      ok: false,
      error: meta.usesWebhook
        ? `Add a ${meta.webhookLabel ?? "webhook URL"}.`
        : `Add a ${meta.apiKeyLabel ?? "API key"}.`,
    };
  }

  const next = mergeIntegrationsSettings({
    connections: base.connections.map((c) =>
      c.id === input.id
        ? {
            ...c,
            connected: true,
            label: input.label?.trim() || meta.label,
            connectedAt: new Date().toISOString(),
          }
        : c,
    ),
  });

  return actionSaveIntegrations({
    websiteId: input.websiteId,
    clientId: input.clientId,
    settings: next,
  });
}

export async function actionDisconnectIntegration(input: {
  websiteId: string;
  clientId: string;
  id: OptionalIntegrationId;
  settings: IntegrationsSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const base = mergeIntegrationsSettings(input.settings);
  const next = mergeIntegrationsSettings({
    connections: base.connections.map((c) =>
      c.id === input.id
        ? {
            ...c,
            connected: false,
            apiKey: "",
            webhookUrl: "",
            connectedAt: "",
          }
        : c,
    ),
  });

  return actionSaveIntegrations({
    websiteId: input.websiteId,
    clientId: input.clientId,
    settings: next,
  });
}
