/**
 * Shared CEP chat turn logic (ADR-011 P1) — used by JSON and SSE routes.
 */
import { and, eq } from "drizzle-orm";
import { answerVisitor, chatConversation } from "@/lib/ai/chat";
import { extractFileText } from "@/lib/ai/file-text";
import { detectHandoffIntent } from "@/lib/ai/handoff";
import { isImageFilename, ocrImageBuffer } from "@/lib/ai/ocr";
import { matchWooProducts } from "@/lib/ai/woo-products";
import { enqueueWebsiteAutomation } from "@/lib/automation/engine";
import {
  getPublishedWidgetConfig,
  setConversationHandoff,
} from "@/lib/cep/cep-service";
import { withAgency } from "@/lib/db";
import {
  clients,
  contacts,
  conversations,
  messages,
  websites,
  textToBlocks,
  type CepChatBlock,
  type CepWidgetSurface,
  type WebsiteSettings,
} from "@/lib/db/schema";

import {
  buildContactCaptureTurn,
  detectContactKind,
  visitorBlocksForAction,
  visitorBodyForAction,
} from "@/lib/cep/contact-intents";

const MAX_QUESTION = 2000;

export type ChatTurnInput = {
  agencyId: string;
  clientId: string;
  websiteId: string;
  message: string;
  conversationId?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  action?: "transfer_agent" | "start_form" | "prechat_lead" | null;
  surface?: CepWidgetSurface;
  attachmentName?: string | null;
  attachmentContent?: string | null;
  attachmentEncoding?: "text" | "base64" | null;
};

export type ChatTurnOk = {
  ok: true;
  conversationId: string;
  reply: string;
  blocks: CepChatBlock[];
  handoffStatus: "ai" | "queued" | "agent";
  /** DB id of the assistant/system message — widget marks it seen to avoid poll duplicates. */
  messageId?: string;
  /** ISO timestamp of the assistant/system message (poll cursor). */
  createdAt?: string;
  provider?: string;
  model?: string;
  skippedAi: boolean;
};

export type ChatTurnErr = {
  ok: false;
  conversationId?: string;
  error: string;
  status: number;
};

export async function runChatTurn(
  input: ChatTurnInput,
): Promise<ChatTurnOk | ChatTurnErr> {
  const question = String(input.message ?? "").trim().slice(0, MAX_QUESTION);
  if (
    !question &&
    input.action !== "transfer_agent" &&
    input.action !== "start_form" &&
    input.action !== "prechat_lead"
  ) {
    return { ok: false, error: "Message was empty.", status: 400 };
  }

  const surface = input.surface ?? "bubble";
  const widget = await getPublishedWidgetConfig(
    input.agencyId,
    input.websiteId,
    surface,
  );
  // Fall back to bubble config for wizard if none published yet
  const cfg =
    widget ??
    (surface !== "bubble"
      ? await getPublishedWidgetConfig(input.agencyId, input.websiteId, "bubble")
      : null);

  const modules = cfg?.payload?.modules ?? {};
  const ai = cfg?.payload?.ai ?? null;
  const systemOverride =
    cfg?.payload?.ai?.systemPromptOverride?.trim() ||
    cfg?.payload?.experience?.aiPrompt?.trim() ||
    null;

  const [client] = await withAgency(input.agencyId, (tx) =>
    tx
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1),
  );

  const conversationId = await chatConversation(
    input.agencyId,
    input.clientId,
    input.websiteId,
    typeof input.conversationId === "string" ? input.conversationId : null,
  );

  const [conv] = await withAgency(input.agencyId, (tx) =>
    tx
      .select({ handoffStatus: conversations.handoffStatus })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1),
  );
  let handoff = conv?.handoffStatus ?? "ai";

  const visitorBody = visitorBodyForAction(question, input.action);
  if (visitorBody && visitorBody !== "[action]") {
    await withAgency(input.agencyId, (tx) =>
      tx.insert(messages).values({
        agencyId: input.agencyId,
        conversationId,
        author: "visitor",
        body: visitorBody,
        blocks: visitorBlocksForAction(question, input.action),
      }),
    );
  } else if (input.action === "transfer_agent" || input.action === "start_form") {
    await withAgency(input.agencyId, (tx) =>
      tx.insert(messages).values({
        agencyId: input.agencyId,
        conversationId,
        author: "visitor",
        body: visitorBodyForAction("", input.action),
        blocks: visitorBlocksForAction("", input.action),
      }),
    );
  }

  const email = String(input.email ?? "").trim().toLowerCase();
  const phone = String(input.phone ?? "").trim().slice(0, 50);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await linkVisitor(
      input,
      conversationId,
      email,
      String(input.name ?? "").trim(),
      phone,
    );
  }

  // Pre-chat gate: create / link the lead, then open the messenger (no AI turn).
  if (input.action === "prechat_lead") {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "A valid email is required.", status: 400 };
    }
    const name = String(input.name ?? "").trim();
    const detail = [phone || null, email].filter(Boolean).join(" · ");
    const leadBody = name
      ? `${name} started a chat (${detail})`
      : `Lead started a chat (${detail})`;
    await withAgency(input.agencyId, (tx) =>
      tx.insert(messages).values({
        agencyId: input.agencyId,
        conversationId,
        author: "visitor",
        body: leadBody,
        blocks: textToBlocks(leadBody),
      }),
    );
    await touchConversation(input.agencyId, conversationId);
    return {
      ok: true,
      conversationId,
      reply: "",
      blocks: [],
      handoffStatus: handoff,
      skippedAi: true,
    };
  }

  let contactKind = detectContactKind({
    question,
    action: input.action,
    handoff,
  });
  if (!contactKind && detectHandoffIntent(question)) {
    contactKind = "transfer";
  }

  if (
    contactKind &&
    (contactKind !== "transfer" || modules.transferAgent !== false)
  ) {
    const captured = await buildContactCaptureTurn({
      agencyId: input.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      conversationId,
      widget: cfg,
      modules,
      kind: contactKind,
      handoff,
      question,
      name: input.name,
      email: input.email,
      onHandoff: fireChatHandoffAutomation,
    });
    handoff = captured.handoffStatus;
    const author = contactKind === "transfer" ? "system" : "ai";
    const saved = await insertAuthorMessage(
      input.agencyId,
      conversationId,
      author,
      captured.reply,
      captured.blocks,
    );
    await touchConversation(input.agencyId, conversationId);
    return {
      ok: true,
      conversationId,
      reply: captured.reply,
      blocks: captured.blocks,
      handoffStatus: handoff,
      skippedAi: true,
      ...turnMessageMeta(saved),
    };
  }

  // Resume AI if visitor asks after queue
  if (
    handoff !== "ai" &&
    /\b(continue with ai|keep chatting with ai|back to (the )?bot|ai please)\b/i.test(
      question,
    )
  ) {
    await setConversationHandoff(input.agencyId, conversationId, "ai");
    handoff = "ai";
  }

  // Human owns the thread — acknowledge without AI
  if (handoff === "queued" || handoff === "agent") {
    const blocks: CepChatBlock[] = [
      {
        type: "system",
        text:
          handoff === "agent"
            ? "Message delivered to your teammate."
            : "You're in the queue — a teammate will reply soon.",
      },
    ];
    const saved = await insertAuthorMessage(
      input.agencyId,
      conversationId,
      "system",
      blocks[0].type === "system" ? blocks[0].text : "",
      blocks,
    );
    await touchConversation(input.agencyId, conversationId);
    return {
      ok: true,
      conversationId,
      reply: blocks[0].type === "system" ? blocks[0].text : "",
      blocks,
      handoffStatus: handoff,
      skippedAi: true,
      ...turnMessageMeta(saved),
    };
  }

  let attachmentText: string | null = null;
  if (input.attachmentContent && input.attachmentName) {
    try {
      const raw =
        input.attachmentEncoding === "base64"
          ? Buffer.from(input.attachmentContent, "base64")
          : Buffer.from(String(input.attachmentContent), "utf8");
      if (isImageFilename(input.attachmentName)) {
        attachmentText = await ocrImageBuffer(raw);
      } else {
        attachmentText = extractFileText(input.attachmentName, raw).text;
      }
    } catch {
      attachmentText = null;
    }
  }

  const result = await answerVisitor({
    agencyId: input.agencyId,
    clientId: input.clientId,
    websiteId: input.websiteId,
    conversationId,
    clientName: client?.name ?? "this business",
    question,
    ai,
    systemPromptOverride: systemOverride,
    attachmentText,
    attachmentName: input.attachmentName,
  });

  await touchConversation(input.agencyId, conversationId);

  if (!result.ok) {
    return {
      ok: false,
      conversationId,
      error: result.error,
      status: result.status,
    };
  }

  let blocks = result.blocks;

  // WooCommerce product carousel (Nexus show_product_carousel parity)
  if (modules.productCarousel === true) {
    const [siteRow] = await withAgency(input.agencyId, (tx) =>
      tx
        .select({ settings: websites.settings })
        .from(websites)
        .where(eq(websites.id, input.websiteId))
        .limit(1),
    );
    const woo = (siteRow?.settings as WebsiteSettings | undefined)?.woo;
    const catalog = woo?.active !== false ? (woo?.products ?? []) : [];
    const matched = matchWooProducts(question, catalog, 8);
    if (matched.length) {
      blocks = [
        ...blocks,
        {
          type: "product_carousel",
          products: matched.map((p) => ({
            id: p.id,
            title: p.title,
            url: p.url,
            image: p.image,
            price: p.price,
            onSale: p.onSale,
            inStock: p.inStock,
            addUrl: p.addUrl,
            addText: p.addText,
          })),
        },
      ];
    }
  }

  // Offer transfer + form when AI admits it doesn't know or handoff intent detected
  if (
    modules.transferAgent !== false &&
    (result.handoffSuggested ||
      /\b(do not have|don't have|pass (the )?question|follow up|someone (can|will))\b/i.test(
        result.reply,
      ))
  ) {
    const buttons: CepChatBlock = {
      type: "buttons",
      buttons: [
        {
          id: "transfer",
          label: "Talk to a human",
          action: "transfer_agent",
        },
      ],
    };
    if (modules.leadForm !== false && cfg?.payload?.leadFormId) {
      buttons.buttons.push({
        id: "form",
        label: "Leave your details",
        action: "start_form",
      });
    }
    blocks = [...blocks, buttons];
  }

  const saved = await insertAuthorMessage(
    input.agencyId,
    conversationId,
    "ai",
    result.reply,
    blocks,
    result.model,
  );

  return {
    ok: true,
    conversationId,
    reply: result.reply,
    blocks,
    handoffStatus: handoff,
    provider: result.provider,
    model: result.model,
    skippedAi: false,
    ...turnMessageMeta(saved),
  };
}

function turnMessageMeta(
  saved: { id: string; createdAt: string } | undefined,
): { messageId?: string; createdAt?: string } {
  if (!saved) return {};
  return { messageId: saved.id, createdAt: saved.createdAt };
}

async function insertAuthorMessage(
  agencyId: string,
  conversationId: string,
  author: "ai" | "system",
  body: string,
  blocks: CepChatBlock[],
  model?: string,
): Promise<{ id: string; createdAt: string } | undefined> {
  const [row] = await withAgency(agencyId, (tx) =>
    tx
      .insert(messages)
      .values({
        agencyId,
        conversationId,
        author,
        body,
        blocks,
        ...(model ? { model } : {}),
      })
      .returning({ id: messages.id, createdAt: messages.createdAt }),
  );
  if (!row) return undefined;
  return { id: row.id, createdAt: row.createdAt.toISOString() };
}

async function insertSystem(
  agencyId: string,
  conversationId: string,
  blocks: CepChatBlock[],
): Promise<{ id: string; createdAt: string } | undefined> {
  const reply = blocks
    .map((b) =>
      b.type === "plain_text" || b.type === "markdown" || b.type === "system"
        ? b.text
        : "",
    )
    .filter(Boolean)
    .join("\n");
  const row = await insertAuthorMessage(
    agencyId,
    conversationId,
    "system",
    reply || "…",
    blocks,
  );
  await touchConversation(agencyId, conversationId);
  return row;
}

async function touchConversation(agencyId: string, conversationId: string) {
  await withAgency(agencyId, (tx) =>
    tx
      .update(conversations)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, conversationId)),
  );
}

async function fireChatHandoffAutomation(input: {
  agencyId: string;
  clientId: string;
  websiteId: string;
  conversationId: string;
  name?: string | null;
  email?: string | null;
  message: string;
}) {
  try {
    const [row] = await withAgency(input.agencyId, (tx) =>
      tx
        .select({
          contactId: conversations.contactId,
          websiteName: websites.name,
          contactName: contacts.name,
          contactEmail: contacts.email,
          contactPhone: contacts.phone,
        })
        .from(conversations)
        .leftJoin(contacts, eq(contacts.id, conversations.contactId))
        .leftJoin(websites, eq(websites.id, conversations.websiteId))
        .where(eq(conversations.id, input.conversationId))
        .limit(1),
    );

    enqueueWebsiteAutomation({
      trigger: "chat_handoff",
      agencyId: input.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      contactId: row?.contactId ?? null,
      conversationId: input.conversationId,
      websiteName: row?.websiteName ?? null,
      contact: {
        name: input.name || row?.contactName || null,
        email: input.email || row?.contactEmail || null,
        phone: row?.contactPhone ?? null,
        message: input.message,
      },
      values: {},
    });
  } catch (err) {
    console.error("[automation] chat_handoff enqueue failed", err);
  }
}

async function linkVisitor(
  identity: { agencyId: string; clientId: string; websiteId: string },
  conversationId: string,
  email: string,
  name: string,
  phone = "",
) {
  await withAgency(identity.agencyId, async (tx) => {
    const [existing] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.clientId, identity.clientId),
          eq(contacts.email, email),
        ),
      )
      .limit(1);

    let contactId = existing?.id;

    if (!contactId) {
      const [created] = await tx
        .insert(contacts)
        .values({
          agencyId: identity.agencyId,
          clientId: identity.clientId,
          sourceWebsiteId: identity.websiteId,
          email,
          name: name || null,
          phone: phone || null,
          status: "new",
        })
        .returning({ id: contacts.id });
      contactId = created.id;
    } else {
      const patch: { name?: string; phone?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };
      if (name) patch.name = name;
      if (phone) patch.phone = phone;
      if (patch.name || patch.phone) {
        await tx
          .update(contacts)
          .set(patch)
          .where(eq(contacts.id, contactId));
      }
    }

    await tx
      .update(conversations)
      .set({ contactId })
      .where(eq(conversations.id, conversationId));
  });
}
