/**
 * Outbound SMS helpers for Auto Rules.
 */

import { mergeTokens, type MergeContext } from "./interpolate";

export async function sendTwilioSms(opts: {
  to: string;
  body: string;
}): Promise<{ ok: boolean; detail: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token || !from) {
    return {
      ok: false,
      detail: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER",
    };
  }

  const to = normalizeE164(opts.to);
  if (!to) {
    return { ok: false, detail: "Invalid SMS destination" };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: opts.body.slice(0, 1500),
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    return {
      ok: false,
      detail: `Twilio ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`,
    };
  }
  return { ok: true, detail: to };
}

export function buildChannelMessage(
  template: string,
  ctx: MergeContext,
  fallback: string,
): string {
  if (template.trim()) return mergeTokens(template, ctx);
  return mergeTokens(fallback, ctx);
}

function normalizeE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length >= 9) return digits;
  const cleaned = digits.replace(/\D/g, "");
  if (cleaned.length >= 10) return `+${cleaned}`;
  return null;
}
