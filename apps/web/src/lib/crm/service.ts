import { and, asc, eq, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  contacts,
  conversations,
  messages,
  pipelineCards,
  pipelineStages,
  pipelines,
} from "@/lib/db/schema";

export type Result<T = void> =
  | ({ ok: true } & (T extends void ? Record<never, never> : T))
  | { ok: false; error: string };

const CONTACT_STATUSES = ["new", "working", "qualified", "won", "lost"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export function isContactStatus(v: string): v is ContactStatus {
  return (CONTACT_STATUSES as readonly string[]).includes(v);
}

/** Move a contact along the funnel. */
export async function setContactStatus(
  agencyId: string,
  contactId: string,
  status: ContactStatus,
): Promise<Result> {
  return withAgency(agencyId, async (tx) => {
    const updated = await tx
      .update(contacts)
      .set({ status, updatedAt: new Date() })
      .where(eq(contacts.id, contactId))
      .returning({ id: contacts.id });

    // Under RLS a contact from another agency is simply not here, so an empty
    // result is the same answer as "does not exist" — which is the right answer.
    if (updated.length === 0) return { ok: false as const, error: "Contact not found." };
    return { ok: true as const };
  });
}

/**
 * Reply to a conversation as the agency.
 *
 * Stamps `firstHumanReplyAt` the first time only. That column is what makes
 * "unworked" meaningful — a thread nobody has answered yet — so overwriting it
 * on every reply would erase the thing it measures.
 */
export async function replyToConversation(
  agencyId: string,
  conversationId: string,
  body: string,
): Promise<Result<{ messageId: string }>> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Write something first." };
  if (text.length > 10_000) return { ok: false, error: "That reply is too long." };

  return withAgency(agencyId, async (tx) => {
    const [conversation] = await tx
      .select({
        id: conversations.id,
        firstHumanReplyAt: conversations.firstHumanReplyAt,
        channel: conversations.channel,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) return { ok: false as const, error: "Conversation not found." };

    const { textToBlocks } = await import("@/lib/db/schema");
    const blocks = textToBlocks(text);

    const [message] = await tx
      .insert(messages)
      .values({
        agencyId,
        conversationId,
        author: "agent",
        body: text,
        blocks,
      })
      .returning({ id: messages.id });

    await tx
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        firstHumanReplyAt: conversation.firstHumanReplyAt ?? new Date(),
        // Agent reply claims the dual-brain thread for chat channels
        ...(conversation.channel === "chat"
          ? { handoffStatus: "agent" as const }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));

    return { ok: true as const, messageId: message.id };
  });
}

export async function takeOverConversation(
  agencyId: string,
  conversationId: string,
): Promise<Result> {
  return withAgency(agencyId, async (tx) => {
    const [updated] = await tx
      .update(conversations)
      .set({ handoffStatus: "agent", updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning({ id: conversations.id });
    if (!updated) return { ok: false as const, error: "Conversation not found." };

    const { textToBlocks } = await import("@/lib/db/schema");
    await tx.insert(messages).values({
      agencyId,
      conversationId,
      author: "system",
      body: "A teammate joined the chat.",
      blocks: textToBlocks("A teammate joined the chat."),
    });
    return { ok: true as const };
  });
}

export async function releaseToAi(
  agencyId: string,
  conversationId: string,
): Promise<Result> {
  return withAgency(agencyId, async (tx) => {
    const [updated] = await tx
      .update(conversations)
      .set({ handoffStatus: "ai", updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning({ id: conversations.id });
    if (!updated) return { ok: false as const, error: "Conversation not found." };

    const { textToBlocks } = await import("@/lib/db/schema");
    await tx.insert(messages).values({
      agencyId,
      conversationId,
      author: "system",
      body: "AI assistant is handling this chat again.",
      blocks: textToBlocks("AI assistant is handling this chat again."),
    });
    return { ok: true as const };
  });
}

export async function setConversationStatus(
  agencyId: string,
  conversationId: string,
  status: "open" | "snoozed" | "closed",
): Promise<Result> {
  return withAgency(agencyId, async (tx) => {
    const updated = await tx
      .update(conversations)
      .set({ status, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId))
      .returning({ id: conversations.id });

    if (updated.length === 0) return { ok: false as const, error: "Conversation not found." };
    return { ok: true as const };
  });
}

/**
 * Put a contact on the pipeline, or move it between stages.
 *
 * A contact has at most one card per pipeline, so this is an upsert rather than
 * an insert — dragging the same person twice must not produce two cards.
 */
export async function moveContactToStage(
  agencyId: string,
  contactId: string,
  stageId: string,
): Promise<Result> {
  return withAgency(agencyId, async (tx) => {
    const [stage] = await tx
      .select({ id: pipelineStages.id, pipelineId: pipelineStages.pipelineId })
      .from(pipelineStages)
      .where(eq(pipelineStages.id, stageId))
      .limit(1);

    if (!stage) return { ok: false as const, error: "Stage not found." };

    const [contact] = await tx
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);

    if (!contact) return { ok: false as const, error: "Contact not found." };

    const [existing] = await tx
      .select({ id: pipelineCards.id })
      .from(pipelineCards)
      .where(
        and(
          eq(pipelineCards.contactId, contactId),
          eq(pipelineCards.pipelineId, stage.pipelineId),
        ),
      )
      .limit(1);

    // Append to the bottom of the target stage.
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${pipelineCards.position}), -1) + 1`.mapWith(Number) })
      .from(pipelineCards)
      .where(eq(pipelineCards.stageId, stageId));

    if (existing) {
      await tx
        .update(pipelineCards)
        .set({ stageId, position: next, updatedAt: new Date() })
        .where(eq(pipelineCards.id, existing.id));
    } else {
      await tx.insert(pipelineCards).values({
        agencyId,
        pipelineId: stage.pipelineId,
        stageId,
        contactId,
        position: next,
      });
    }

    return { ok: true as const };
  });
}

/** The board: stages in order, each with its cards. */
export async function loadPipeline(agencyId: string, clientId: string) {
  return withAgency(agencyId, async (tx) => {
    const [pipeline] = await tx
      .select({ id: pipelines.id, name: pipelines.name })
      .from(pipelines)
      .where(eq(pipelines.clientId, clientId))
      .limit(1);

    if (!pipeline) return null;

    const stages = await tx
      .select({ id: pipelineStages.id, name: pipelineStages.name, position: pipelineStages.position })
      .from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, pipeline.id))
      .orderBy(asc(pipelineStages.position));

    const cards = await tx
      .select({
        id: pipelineCards.id,
        stageId: pipelineCards.stageId,
        position: pipelineCards.position,
        contactId: contacts.id,
        name: contacts.name,
        email: contacts.email,
        status: contacts.status,
      })
      .from(pipelineCards)
      .innerJoin(contacts, eq(contacts.id, pipelineCards.contactId))
      .where(eq(pipelineCards.pipelineId, pipeline.id))
      .orderBy(asc(pipelineCards.position));

    return {
      pipeline,
      stages: stages.map((s) => ({
        ...s,
        cards: cards.filter((c) => c.stageId === s.id),
      })),
    };
  });
}
