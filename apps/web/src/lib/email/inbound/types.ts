/**
 * One shape for an inbound email, whichever provider delivered it.
 *
 * Providers disagree about almost everything — Postmark POSTs the whole parsed
 * message, Resend POSTs metadata and makes you fetch the body — so the adapters
 * normalise into this and the rest of the system never learns which one is in
 * use.
 */
export type InboundEmail = {
  /** The `+suffix` of the recipient address: our conversation reply token. */
  replyToken: string | null;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  /** Quoted history already stripped where the provider offers that. */
  text: string;
  /** Provider's own id, kept so a duplicate delivery can be recognised. */
  providerMessageId: string | null;
  /**
   * True for out-of-office notices, bounces and other machine mail. These must
   * never be appended to a thread or replied to — two systems auto-replying to
   * each other is a mail loop that ends in a blocked sending domain.
   */
  isAutomated: boolean;
};

export type InboundAdapter = {
  name: string;
  /** Returns null when the payload is not something this adapter recognises. */
  parse(body: unknown, headers: Headers): Promise<InboundEmail | null>;
};

/** Header names that mark machine-generated mail. */
const AUTOMATION_HEADERS = [
  "auto-submitted", // RFC 3834: anything but "no" is automated
  "x-autoreply",
  "x-autorespond",
  "x-auto-response-suppress",
];

export function looksAutomated(
  headers: Record<string, string>,
  subject: string | null,
): boolean {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]),
  );

  for (const name of AUTOMATION_HEADERS) {
    const value = lower[name];
    if (value && value.toLowerCase() !== "no") return true;
  }

  const precedence = (lower["precedence"] ?? "").toLowerCase();
  if (["bulk", "auto_reply", "junk", "list"].includes(precedence)) return true;

  // Last resort: many auto-responders set no headers at all.
  const s = (subject ?? "").toLowerCase();
  return /out of office|automatic reply|autoreply|undeliverable|delivery status notification/.test(s);
}

/** Pull the `+suffix` out of `reply+TOKEN@domain`. */
export function tokenFromAddress(address: string): string | null {
  const local = address.split("@")[0] ?? "";
  const plus = local.indexOf("+");
  if (plus === -1) return null;
  const token = local.slice(plus + 1).trim();
  return token || null;
}

/**
 * Cut a reply down to what the person actually wrote.
 *
 * Used only when the provider does not do it for us. Deliberately conservative:
 * keeping a few quoted lines is a cosmetic problem, while cutting real text is
 * a lost customer message.
 */
export function stripQuotedReply(text: string): string {
  const lines = text.split(/\r?\n/);
  const cut = lines.findIndex((line) =>
    /^\s*(>|On .+ wrote:|-{2,}\s*Original Message|_{5,}|From:\s)/.test(line),
  );
  const kept = cut === -1 ? lines : lines.slice(0, cut);
  return kept.join("\n").trim();
}
