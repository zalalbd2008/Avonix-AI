import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAgency } from "@/lib/db";
import { adminDb } from "@/lib/db/admin";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { mergeAutomationSettings } from "@/lib/automation/types";
import { mergeIntegrationsSettings } from "@/lib/integrations/types";
import {
  getTelegramBotConfig,
  parseTelegramStartPayload,
  sendTelegramMessage,
} from "@/lib/telegram/platform-bot";

type TgUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number; type?: string };
    from?: { id?: number; first_name?: string; username?: string };
    contact?: { phone_number?: string; user_id?: number };
  };
};

type WebsiteRow = {
  id: string;
  agencyId: string;
  clientId: string;
  settings: WebsiteSettings | null;
};

/**
 * POST /api/telegram/webhook
 * Platform bot receives /start payload and links chat → website.
 */
export async function POST(req: Request) {
  if (!getTelegramBotConfig().enabled) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const msg = update.message;
  const text = (msg?.text ?? "").trim();
  const chatId = msg?.chat?.id;
  if (!chatId || !text.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const payload = text.replace(/^\/start\s*/i, "").trim();
  if (!payload) {
    await sendTelegramMessage({
      chatId,
      text: "Open Avonix → Integrations → Telegram, enter your phone, then tap Connect again.",
    });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseTelegramStartPayload(payload);
  if (!parsed) {
    await sendTelegramMessage({
      chatId,
      text: "This link is invalid or expired. Go back to Avonix and tap Connect again.",
    });
    return NextResponse.json({ ok: true });
  }

  let row: WebsiteRow | null = null;

  if (parsed.agencyId) {
    // Preferred: tenant context so RLS sees the website (DATABASE_URL / avonix_app).
    row = await withAgency(parsed.agencyId, async (tx) => {
      const [found] = await tx
        .select({
          id: websites.id,
          agencyId: websites.agencyId,
          clientId: websites.clientId,
          settings: websites.settings,
        })
        .from(websites)
        .where(eq(websites.id, parsed.websiteId))
        .limit(1);
      return found ?? null;
    });
  } else {
    // Legacy deep links: needs ADMIN_DATABASE_URL (bypasses RLS).
    const [found] = await adminDb
      .select({
        id: websites.id,
        agencyId: websites.agencyId,
        clientId: websites.clientId,
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, parsed.websiteId))
      .limit(1);
    row = found ?? null;
  }

  if (!row) {
    await sendTelegramMessage({
      chatId,
      text: "Website not found. Please reconnect from Avonix.",
    });
    return NextResponse.json({ ok: true });
  }

  const agencyId = row.agencyId;
  const integrations = mergeIntegrationsSettings(row.settings?.integrations);
  const phone =
    integrations.connections.find((c) => c.id === "telegram")?.meta?.phone ??
    "";

  const updatedConnections = integrations.connections.map((c) =>
    c.id === "telegram"
      ? {
          ...c,
          connected: true,
          apiKey: "",
          connectedAt: new Date().toISOString(),
          label: c.label || phone || "Telegram",
          meta: {
            ...(c.meta ?? {}),
            phone: phone || (c.meta?.phone ?? ""),
            chatId: String(chatId),
            telegramUser:
              msg?.from?.username || msg?.from?.first_name || "",
            pending: "",
          },
        }
      : c,
  );

  const automation = mergeAutomationSettings(row.settings?.automation);
  const socialAccounts = automation.socialAccounts.map((a) =>
    a.provider === "telegram"
      ? {
          ...a,
          connected: true,
          accountId: String(chatId),
          accessToken: "",
          label: a.label || phone || "Telegram alerts",
          connectedAt: new Date().toISOString(),
        }
      : a,
  );

  const next: WebsiteSettings = {
    ...(row.settings ?? {}),
    integrations: { connections: updatedConnections },
    automation: { ...automation, socialAccounts },
  };

  await withAgency(agencyId, async (tx) => {
    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, row!.id));
  });

  await sendTelegramMessage({
    chatId,
    text: "Avonix is connected. You’ll get alerts here. You can close Telegram.",
  });

  return NextResponse.json({ ok: true });
}
