"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { mergeAutomationSettings } from "@/lib/automation/types";
import {
  canConnectConnection,
  mergeIntegrationsSettings,
  optionalMeta,
  type IntegrationsSettings,
  type OptionalIntegrationId,
} from "./types";
import {
  ensureTelegramWebhook,
  isTelegramBotEnabled,
  normalizeTelegramPhone,
  telegramDeepLink,
} from "@/lib/telegram/platform-bot";

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
            meta: {},
          }
        : c,
    ),
  });

  // Also clear automation Telegram link when disconnecting.
  if (input.id === "telegram") {
    const ctx = await requireAgency();
    if (!canEditWebsites(ctx.permissions)) {
      return { ok: false, error: "No permission." };
    }
    await withAgency(ctx.agencyId, async (tx) => {
      const [row] = await tx
        .select({ settings: websites.settings })
        .from(websites)
        .where(eq(websites.id, input.websiteId))
        .limit(1);
      if (!row) return;
      const automation = mergeAutomationSettings(row.settings?.automation);
      const socialAccounts = automation.socialAccounts.map((a) =>
        a.provider === "telegram"
          ? {
              ...a,
              connected: false,
              accountId: "",
              accessToken: "",
              connectedAt: "",
            }
          : a,
      );
      const nextSettings: WebsiteSettings = {
        ...(row.settings ?? {}),
        integrations: next,
        automation: { ...automation, socialAccounts },
      };
      await tx
        .update(websites)
        .set({ settings: nextSettings, updatedAt: new Date() })
        .where(eq(websites.id, input.websiteId));
    });
    const path = `/clients/${input.clientId}/websites/${input.websiteId}`;
    revalidatePath(path);
    revalidatePath(`${path}/integrations`);
    revalidatePath(`${path}/automation`);
    return { ok: true };
  }

  return actionSaveIntegrations({
    websiteId: input.websiteId,
    clientId: input.clientId,
    settings: next,
  });
}

/**
 * Connect Telegram with phone only — platform bot, no user bot token.
 * Returns a deep link; user taps Start in Telegram to finish.
 */
export async function actionConnectTelegramPhone(input: {
  websiteId: string;
  clientId: string;
  phone: string;
  label?: string;
}): Promise<
  | { ok: true; deepLink: string; pending: true }
  | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return { ok: false, error: "No permission." };
  }

  if (!isTelegramBotEnabled()) {
    return {
      ok: false,
      error:
        "Telegram is not enabled on this platform. Ask your admin to set TELEGRAM_BOT_TOKEN and TELEGRAM_BOT_USERNAME.",
    };
  }

  const phone = normalizeTelegramPhone(input.phone);
  if (!phone) {
    return {
      ok: false,
      error: "Enter a valid phone number with country code (e.g. +8801XXXXXXXXX).",
    };
  }

  await ensureTelegramWebhook();

  const deepLink = telegramDeepLink(input.websiteId, ctx.agencyId);

  await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return;

    const integrations = mergeIntegrationsSettings(row.settings?.integrations);
    const updatedConnections = integrations.connections.map((c) =>
      c.id === "telegram"
        ? {
            ...c,
            connected: false,
            apiKey: "",
            label: input.label?.trim() || phone,
            connectedAt: "",
            meta: {
              phone,
              chatId: "",
              pending: "1",
            },
          }
        : c,
    );

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      integrations: { connections: updatedConnections },
    };

    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));
  });

  const base = `/clients/${input.clientId}/websites/${input.websiteId}`;
  revalidatePath(base);
  revalidatePath(`${base}/integrations`);

  return { ok: true, deepLink, pending: true };
}
