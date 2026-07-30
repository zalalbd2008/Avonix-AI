/**
 * Platform Telegram bot — one Avonix bot for all agencies.
 * Users connect with phone number + one tap in Telegram (no bot token).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { appBaseUrl } from "@/lib/backups/drive-oauth";

function env(...keys: string[]) {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

function stateSecret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.TELEGRAM_LINK_SECRET?.trim() ||
    "dev-telegram-link"
  );
}

export function getTelegramBotConfig() {
  const token = env("TELEGRAM_BOT_TOKEN");
  const username = env("TELEGRAM_BOT_USERNAME").replace(/^@/, "");
  return {
    enabled: Boolean(token && username),
    token,
    username,
  };
}

export function isTelegramBotEnabled() {
  return getTelegramBotConfig().enabled;
}

export function telegramWebhookUrl() {
  return `${appBaseUrl()}/api/telegram/webhook`;
}

/** Normalize to digits-only international form when possible. */
export function normalizeTelegramPhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  const cleaned = digits.startsWith("+")
    ? `+${digits.slice(1).replace(/\D/g, "")}`
    : digits.replace(/\D/g, "");
  if (cleaned.startsWith("+") && cleaned.length >= 10 && cleaned.length <= 16) {
    return cleaned;
  }
  // Bangladesh local 01XXXXXXXXX → +8801XXXXXXXXX
  if (/^01\d{9}$/.test(cleaned)) return `+880${cleaned.slice(1)}`;
  if (cleaned.length >= 10 && cleaned.length <= 15) return `+${cleaned}`;
  return null;
}

export function makeTelegramStartPayload(websiteId: string): string {
  const id = websiteId.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(id)) {
    throw new Error("Invalid website id for Telegram link.");
  }
  const sig = createHmac("sha256", stateSecret())
    .update(`tg:${id}`)
    .digest("hex")
    .slice(0, 8);
  return `${id}${sig}`;
}

export function parseTelegramStartPayload(
  raw: string,
): { websiteId: string } | null {
  const token = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(token)) return null;
  const id = token.slice(0, 32);
  const sig = token.slice(32);
  const expected = createHmac("sha256", stateSecret())
    .update(`tg:${id}`)
    .digest("hex")
    .slice(0, 8);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const websiteId = [
    id.slice(0, 8),
    id.slice(8, 12),
    id.slice(12, 16),
    id.slice(16, 20),
    id.slice(20),
  ].join("-");
  return { websiteId };
}

export function telegramDeepLink(websiteId: string): string {
  const { username } = getTelegramBotConfig();
  const payload = makeTelegramStartPayload(websiteId);
  return `https://t.me/${username}?start=${payload}`;
}

export async function sendTelegramMessage(opts: {
  chatId: string | number;
  text: string;
}): Promise<{ ok: boolean; detail: string }> {
  const { token, enabled } = getTelegramBotConfig();
  if (!enabled) {
    return { ok: false, detail: "Telegram bot is not configured on this platform." };
  }
  const res = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: opts.chatId,
        text: opts.text.slice(0, 4000),
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return {
      ok: false,
      detail: `Telegram HTTP ${res.status}${err ? `: ${err.slice(0, 120)}` : ""}`,
    };
  }
  return { ok: true, detail: String(opts.chatId) };
}

/** Ensure Telegram delivers updates to our webhook (idempotent). */
export async function ensureTelegramWebhook(): Promise<void> {
  const { token, enabled } = getTelegramBotConfig();
  if (!enabled) return;
  const url = telegramWebhookUrl();
  await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    }),
  }).catch(() => {
    /* non-fatal */
  });
}
