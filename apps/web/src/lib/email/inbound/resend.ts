import {
  looksAutomated,
  stripQuotedReply,
  tokenFromAddress,
  type InboundAdapter,
  type InboundEmail,
} from "./types";

type ResendReceived = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    message_id?: string;
  };
};

/**
 * Resend's `email.received` webhook carries metadata only — no body — so the
 * body has to be fetched afterwards by email id.
 *
 * That second call is why Postmark is the easier inbound provider: one round
 * trip versus two, and a failure in the fetch means a reply that arrived at the
 * mail server but never reaches the thread.
 */
export const resendInbound: InboundAdapter = {
  name: "resend",
  async parse(body) {
    const p = body as ResendReceived;
    if (p?.type !== "email.received" || !p.data) return null;

    const to = p.data.to ?? [];
    const token = to.map((address) => tokenFromAddress(address)).find((t) => t) ?? null;
    const from = (p.data.from ?? "").toLowerCase().trim();
    const subject = p.data.subject ?? null;

    let text = "";
    const apiKey = process.env.RESEND_API_KEY;

    if (p.data.email_id && apiKey) {
      try {
        const res = await fetch(
          `https://api.resend.com/emails/receiving/${p.data.email_id}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        if (res.ok) {
          const full = (await res.json()) as { text?: string; html?: string };
          text = stripQuotedReply(full.text ?? "");
        } else {
          console.error("resend inbound: body fetch failed", res.status);
        }
      } catch (e) {
        console.error("resend inbound: body fetch threw", e);
      }
    }

    return {
      replyToken: token,
      fromEmail: from,
      fromName: null,
      subject,
      text,
      providerMessageId: p.data.message_id ?? p.data.email_id ?? null,
      // Resend's webhook does not forward headers, so only the subject heuristic
      // is available here.
      isAutomated: looksAutomated({}, subject),
    } satisfies InboundEmail;
  },
};
