/**
 * Contact-intent helpers for CEP chat (book a call, support, live agent).
 */
import {
  getLeadFormEmbed,
  setConversationHandoff,
} from "@/lib/cep/cep-service";
import type { CepWidget } from "@/lib/db/schema";
import {
  textToBlocks,
  type CepChatBlock,
  type CepWidgetModules,
  type CepWidgetPayload,
} from "@/lib/db/schema";

export const TRANSFER_RE =
  /\b(talk to (a )?(human|agent|person|designer|representative)|speak to (a )?(human|agent|person|designer)|real person|live agent|human please|transfer me)\b/i;

export const BOOKING_RE =
  /\b(book(ing)?( a)? (call|demo|consultation|appointment|meeting)|schedule( a)? (call|demo|consultation|meeting)|discovery call|book a call|set up a call|request a call)\b/i;

export const SUPPORT_RE =
  /\b(support|help desk|customer service|get in touch|contact (us|you|me)|call me back|callback|need help|speak with|talk with|live chat|reach out|representative)\b/i;

export type ContactKind = "booking" | "transfer" | "support";

export function detectContactKind(input: {
  question: string;
  action?: "transfer_agent" | "start_form" | "prechat_lead" | null;
  handoff: "ai" | "queued" | "agent";
}): ContactKind | null {
  if (input.action === "transfer_agent") return "transfer";
  if (input.action === "start_form") return "support";
  if (input.handoff !== "ai") return null;
  if (BOOKING_RE.test(input.question)) return "booking";
  if (TRANSFER_RE.test(input.question)) return "transfer";
  if (SUPPORT_RE.test(input.question)) return "support";
  return null;
}

function telHref(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function contactButtons(payload: CepWidgetPayload | undefined): NonNullable<
  Extract<CepChatBlock, { type: "buttons" }>
>["buttons"] {
  const theme = payload?.theme;
  const out: NonNullable<
    Extract<CepChatBlock, { type: "buttons" }>
  >["buttons"] = [];
  const phone = theme?.contactPhone?.trim();
  if (phone) {
    const href = telHref(phone);
    if (href) {
      out.push({
        id: "call",
        label: `Call ${phone}`,
        action: "open_url",
        value: href,
      });
    }
  }
  const bookingUrl = theme?.bookingUrl?.trim();
  if (bookingUrl && /^https?:\/\//i.test(bookingUrl)) {
    out.push({
      id: "book",
      label: "Open booking page",
      action: "open_url",
      value: bookingUrl,
    });
  }
  return out;
}

function introForKind(kind: ContactKind): string {
  switch (kind) {
    case "booking":
      return "Great — share your details below and we'll confirm a time for your call. You can also use the options here if you prefer.";
    case "transfer":
      return "Got it — a teammate will follow up. Please leave your details below so we can reach you.";
    case "support":
      return "We're here to help. Fill in the form below and a representative will contact you.";
  }
}

export async function buildContactCaptureTurn(opts: {
  agencyId: string;
  clientId: string;
  conversationId: string;
  widget: CepWidget | null;
  modules: CepWidgetModules;
  kind: ContactKind;
  handoff: "ai" | "queued" | "agent";
  question: string;
  name?: string | null;
  email?: string | null;
  onHandoff: (input: {
    agencyId: string;
    clientId: string;
    websiteId: string;
    conversationId: string;
    name?: string | null;
    email?: string | null;
    message: string;
  }) => void;
  websiteId: string;
}): Promise<{
  reply: string;
  blocks: CepChatBlock[];
  handoffStatus: "ai" | "queued" | "agent";
}> {
  const payload = opts.widget?.payload;
  const formId = payload?.leadFormId;
  let handoff = opts.handoff;

  if (opts.kind === "transfer" && opts.modules.transferAgent !== false) {
    await setConversationHandoff(opts.agencyId, opts.conversationId, "queued");
    handoff = "queued";
    opts.onHandoff({
      agencyId: opts.agencyId,
      clientId: opts.clientId,
      websiteId: opts.websiteId,
      conversationId: opts.conversationId,
      name: opts.name,
      email: opts.email,
      message: opts.question || "Visitor requested a human",
    });
  }

  const reply = introForKind(opts.kind);
  const blocks: CepChatBlock[] = [{ type: "plain_text", text: reply }];

  const linkButtons = opts.kind === "booking" ? contactButtons(payload) : [];
  if (linkButtons.length) {
    blocks.push({ type: "buttons", buttons: linkButtons });
  }

  if (opts.modules.leadForm !== false && formId) {
    const embed = await getLeadFormEmbed(
      opts.agencyId,
      opts.clientId,
      formId,
    );
    if (embed) {
      blocks.push({
        type: "lead_form",
        formId: embed.formId,
        title: embed.title,
        html: embed.html,
      });
    } else {
      blocks.push({
        type: "system",
        text: "That contact form could not be loaded.",
      });
    }
  } else {
    blocks.push({
      type: "system",
      text: "No contact form is linked to this chat yet. The site owner can add one under Chat → Behavior → Lead form.",
    });
  }

  if (opts.kind === "transfer" && handoff === "queued") {
    blocks.push({
      type: "buttons",
      buttons: [
        {
          id: "stay",
          label: "Keep chatting with AI",
          action: "send_text",
          value: "Please continue with AI",
        },
      ],
    });
  }

  return { reply, blocks, handoffStatus: handoff };
}

export function visitorBodyForAction(
  question: string,
  action?: "transfer_agent" | "start_form" | null,
): string {
  if (question) return question;
  if (action === "transfer_agent") return "Talk to a human";
  if (action === "start_form") return "Contact request";
  return "[action]";
}

export function visitorBlocksForAction(
  question: string,
  action?: "transfer_agent" | "start_form" | null,
) {
  return textToBlocks(visitorBodyForAction(question, action));
}
