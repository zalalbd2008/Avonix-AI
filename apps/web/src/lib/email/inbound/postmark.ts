import {
  looksAutomated,
  stripQuotedReply,
  tokenFromAddress,
  type InboundAdapter,
  type InboundEmail,
} from "./types";

type PostmarkAddress = { Email?: string; Name?: string; MailboxHash?: string };

type PostmarkInbound = {
  MessageID?: string;
  From?: string;
  FromName?: string;
  FromFull?: PostmarkAddress;
  ToFull?: PostmarkAddress[];
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  /** Postmark's own attempt at removing quoted history. Preferred when present. */
  StrippedTextReply?: string;
  Headers?: { Name: string; Value: string }[];
};

/**
 * Postmark posts the entire parsed message in one request, and extracts the
 * `+suffix` of the recipient into `MailboxHash` — which is exactly the routing
 * key we need, already parsed.
 */
export const postmarkInbound: InboundAdapter = {
  name: "postmark",
  async parse(body) {
    const p = body as PostmarkInbound;
    if (!p || typeof p !== "object") return null;
    // Postmark payloads always carry a From and at least one recipient.
    if (!p.From && !p.FromFull?.Email) return null;
    if (!Array.isArray(p.ToFull)) return null;

    const headers: Record<string, string> = {};
    for (const h of p.Headers ?? []) headers[h.Name] = h.Value;

    // MailboxHash is populated on whichever recipient carried the +suffix.
    const hash =
      p.ToFull.map((t) => t.MailboxHash).find((h) => h) ??
      p.ToFull.map((t) => tokenFromAddress(t.Email ?? "")).find((t) => t) ??
      null;

    const text = (p.StrippedTextReply?.trim() || stripQuotedReply(p.TextBody ?? "")).trim();

    return {
      replyToken: hash,
      fromEmail: (p.FromFull?.Email ?? p.From ?? "").toLowerCase().trim(),
      fromName: p.FromFull?.Name ?? p.FromName ?? null,
      subject: p.Subject ?? null,
      text,
      providerMessageId: p.MessageID ?? null,
      isAutomated: looksAutomated(headers, p.Subject ?? null),
    } satisfies InboundEmail;
  },
};
