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

function uuidToBuf(id: string): Buffer {
  const hex = id.replace(/-/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) {
    throw new Error("Invalid uuid for Telegram link.");
  }
  return Buffer.from(hex, "hex");
}

function bufToUuid(buf: Buffer): string {
  const hex = buf.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/**
 * Deep-link payload (Telegram start param ≤64 chars, [A-Za-z0-9_-] only).
 * Encodes websiteId + agencyId so the webhook can set RLS tenant context.
 * Format: base64url(16B website + 16B agency) + 8-char base64url HMAC ≈ 51 chars.
 */
export function makeTelegramStartPayload(
  websiteId: string,
  agencyId: string,
): string {
  const body = Buffer.concat([
    uuidToBuf(websiteId),
    uuidToBuf(agencyId),
  ]).toString("base64url");
  const sig = createHmac("sha256", stateSecret())
    .update(`tg2:${body}`)
    .digest("base64url")
    .slice(0, 8);
  return `${body}${sig}`;
}

export function parseTelegramStartPayload(
  raw: string,
): { websiteId: string; agencyId: string } | null {
  const token = raw.trim();

  // New format: base64url body (43) + sig (8)
  if (/^[A-Za-z0-9_-]{48,56}$/.test(token) && token.length >= 48) {
    const body = token.slice(0, -8);
    const sig = token.slice(-8);
    const expected = createHmac("sha256", stateSecret())
      .update(`tg2:${body}`)
      .digest("base64url")
      .slice(0, 8);
    try {
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    } catch {
      return null;
    }
    try {
      const buf = Buffer.from(body, "base64url");
      if (buf.length !== 32) return null;
      return {
        websiteId: bufToUuid(buf.subarray(0, 16)),
        agencyId: bufToUuid(buf.subarray(16, 32)),
      };
    } catch {
      return null;
    }
  }

  // Legacy: website hex (32) + sig hex (8) — no agency; caller must use adminDb
  const legacy = token.toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(legacy)) return null;
  const id = legacy.slice(0, 32);
  const sig = legacy.slice(32);
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
  const websiteId = bufToUuid(Buffer.from(id, "hex"));
  return { websiteId, agencyId: "" };
}

export function telegramDeepLink(
  websiteId: string,
  agencyId: string,
): string {
  const { username } = getTelegramBotConfig();
  const payload = makeTelegramStartPayload(websiteId, agencyId);
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
