import type { Email } from "../types";
import { layout } from "./_layout";

/**
 * An agency's reply, sent to the person who filled in the form.
 *
 * Branded as the *client* business, not as Avonix: the visitor contacted
 * Harbour Dental, and an email from "Avonix AI" about their enquiry would look
 * like spam. This is also why white-labelling (ADR-003, v2) belongs on Agency —
 * the sending identity is already client-shaped.
 */
export function agencyReplyEmail({
  to,
  contactName,
  clientName,
  body,
  replyTo,
}: {
  to: string;
  contactName?: string | null;
  clientName: string;
  body: string;
  replyTo?: string | null;
}): Email {
  const greeting = contactName ? `Hi ${contactName},` : "Hi,";

  // The reply is written by a person in a plain textarea, so it is untrusted
  // text going into an HTML email: escape it, then turn newlines into breaks.
  const html = escapeHtml(body).replace(/\n/g, "<br>");

  return {
    to,
    subject: `Re: your enquiry — ${clientName}`,
    replyTo: replyTo ?? undefined,
    html: layout({
      heading: `A reply from ${clientName}`,
      body: [greeting, html],
      footer: replyTo
        ? `You can reply directly to this email and it will reach ${clientName}.`
        : `This message was sent by ${clientName}.`,
    }),
    text: [greeting, "", body, "", `— ${clientName}`].join("\n"),
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
