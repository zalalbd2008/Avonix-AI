/**
 * Shared CEP chat turn logic (ADR-011 P1) — used by JSON and SSE routes.
 */
import { and, eq } from "drizzle-orm";
import { answerVisitor, chatConversation } from "@/lib/ai/chat";
import { enqueueWebsiteAutomation } from "@/lib/automation/engine";
import {
  getLeadFormEmbed,
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
} from "@/lib/db/schema";

const MAX_QUESTION = 2000;

const TRANSFER_RE =
  /\b(talk to (a )?human|speak to (a )?(human|agent|person|designer)|real person|live agent|transfer|human please)\b/i;

const BOOKING_RE =
  /\b(book (a )?(call|demo|consultation|appointment|meeting)|schedule (a )?(call|demo|consultation|meeting)|discovery call|book a call)\b/i;

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

  const wantsTransfer =
    input.action === "transfer_agent" ||
    (modules.transferAgent !== false && TRANSFER_RE.test(question));

  if (question) {
    await withAgency(input.agencyId, (tx) =>
      tx.insert(messages).values({
        agencyId: input.agencyId,
        conversationId,
        author: "visitor",
        body: question || "[action]",
        blocks: textToBlocks(question || "Talk to a human"),
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

  // Lead form request
  if (input.action === "start_form") {
    const formId = cfg?.payload?.leadFormId;
    if (!formId || modules.leadForm === false) {
      const blocks: CepChatBlock[] = [
        {
          type: "system",
          text: "No lead form is linked to this chat yet.",
        },
      ];
      const saved = await insertSystem(input.agencyId, conversationId, blocks);
      return {
        ok: true,
        conversationId,
        reply: "No lead form is linked to this chat yet.",
        blocks,
        handoffStatus: handoff,
        skippedAi: true,
        ...turnMessageMeta(saved),
      };
    }
    const embed = await getLeadFormEmbed(input.agencyId, input.clientId, formId);
    const blocks: CepChatBlock[] = embed
      ? [
          {
            type: "lead_form",
            formId: embed.formId,
            title: embed.title,
            html: embed.html,
          },
        ]
      : [{ type: "system", text: "That form could not be loaded." }];
    const reply = embed ? `Please fill in: ${embed.title}` : "Form unavailable.";
    const saved = await insertAuthorMessage(
      input.agencyId,
      conversationId,
      "system",
      reply,
      blocks,
    );
    await touchConversation(input.agencyId, conversationId);
    return {
      ok: true,
      conversationId,
      reply,
      blocks,
      handoffStatus: handoff,
      skippedAi: true,
      ...turnMessageMeta(saved),
    };
  }

  if (wantsTransfer && modules.transferAgent !== false) {
    await setConversationHandoff(input.agencyId, conversationId, "queued");
    handoff = "queued";
    const blocks: CepChatBlock[] = [
      {
        type: "system",
        text: "Connecting you with a teammate. They will reply here shortly.",
      },
      {
        type: "buttons",
        buttons: [
          {
            id: "stay",
            label: "Keep chatting with AI",
            action: "send_text",
            value: "Please continue with AI",
          },
        ],
      },
    ];
    if (modules.leadForm !== false && cfg?.payload?.leadFormId) {
      blocks[1] = {
        type: "buttons",
        buttons: [
          {
            id: "stay",
            label: "Keep chatting with AI",
            action: "send_text",
            value: "Please continue with AI",
          },
          {
            id: "form",
            label: "Leave your details",
            action: "start_form",
          },
        ],
      };
    }
    const reply = "Connecting you with a teammate. They will reply here shortly.";
    const saved = await insertAuthorMessage(
      input.agencyId,
      conversationId,
      "system",
      reply,
      blocks,
    );
    await touchConversation(input.agencyId, conversationId);

    void fireChatHandoffAutomation({
      agencyId: input.agencyId,
      clientId: input.clientId,
      websiteId: input.websiteId,
      conversationId,
      name: input.name,
      email: input.email,
      message: question || "Visitor requested a human",
    });

    return {
      ok: true,
      conversationId,
      reply,
      blocks,
      handoffStatus: handoff,
      skippedAi: true,
      ...turnMessageMeta(saved),
    };
  }

  // Booking / call CTAs — guide to form or human instead of inventing a calendar.
  if (handoff === "ai" && BOOKING_RE.test(question)) {
    const buttons: NonNullable<Extract<CepChatBlock, { type: "buttons" }>["buttons"]> =
      [];
    if (modules.leadForm !== false && cfg?.payload?.leadFormId) {
      buttons.push({
        id: "form",
        label: "Leave your details",
        action: "start_form",
      });
    }
    if (modules.transferAgent !== false) {
      buttons.push({
        id: "transfer",
        label: "Talk to a human",
        action: "transfer_agent",
      });
    }
    const reply =
      "Happy to help you book a call. Leave your details below (or talk to a teammate) and we’ll confirm a time — we won’t invent availability.";
    const blocks: CepChatBlock[] = [
      { type: "plain_text", text: reply },
      ...(buttons.length ? [{ type: "buttons" as const, buttons }] : []),
    ];
    const saved = await insertAuthorMessage(
      input.agencyId,
      conversationId,
      "ai",
      reply,
      blocks,
    );
    await touchConversation(input.agencyId, conversationId);
    return {
      ok: true,
      conversationId,
      reply,
      blocks,
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

  const result = await answerVisitor({
    agencyId: input.agencyId,
    clientId: input.clientId,
    websiteId: input.websiteId,
    conversationId,
    clientName: client?.name ?? "this business",
    question,
    ai,
    systemPromptOverride: systemOverride,
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
  // Offer transfer + form when AI admits it doesn't know
  if (
    modules.transferAgent !== false &&
    /\b(do not have|don't have|pass (the )?question|follow up|someone (can|will))\b/i.test(
      result.reply,
    )
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
