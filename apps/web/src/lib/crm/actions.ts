"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { conversations, websites } from "@/lib/db/schema";
import { deliverReply } from "./deliver";
import {
  isContactStatus,
  moveContactToStage,
  releaseToAi,
  replyToConversation,
  setContactStatus,
  setConversationStatus,
  takeOverConversation,
} from "./service";

export async function updateContactStatus(
  clientId: string,
  contactId: string,
  status: string,
) {
  const ctx = await requireAgency();
  if (!isContactStatus(status)) return { ok: false as const, error: "Unknown status." };

  const result = await setContactStatus(ctx.agencyId, contactId, status);
  if (result.ok) {
    revalidatePath(`/clients/${clientId}/contacts`);
    revalidatePath(`/clients/${clientId}/contacts/${contactId}`);
  }
  return result;
}

export async function sendReply(
  clientId: string,
  conversationId: string,
  body: string,
) {
  const ctx = await requireAgency();

  // Store first. Delivery is attempted afterwards and its failure must never
  // cost the agency the text they wrote.
  const result = await replyToConversation(ctx.agencyId, conversationId, body);
  if (!result.ok) return result;

  const outcome = await deliverReply(ctx.agencyId, result.messageId);

  revalidatePath(`/clients/${clientId}/inbox/${conversationId}`);
  revalidatePath(`/clients/${clientId}/inbox`);
  revalidatePath("/inbox");

  return {
    ...result,
    delivered: outcome.delivered,
    deliveryNote: outcome.delivered ? null : outcome.reason,
  };
}

export async function closeConversation(
  clientId: string,
  conversationId: string,
  status: "open" | "closed",
) {
  const ctx = await requireAgency();
  const result = await setConversationStatus(ctx.agencyId, conversationId, status);
  if (result.ok) {
    revalidatePath(`/clients/${clientId}/inbox`);
    revalidatePath(`/clients/${clientId}/inbox/${conversationId}`);
    revalidatePath("/inbox");
  }
  return result;
}

export async function moveCard(
  clientId: string,
  contactId: string,
  stageId: string,
) {
  const ctx = await requireAgency();
  const result = await moveContactToStage(ctx.agencyId, contactId, stageId);
  if (result.ok) revalidatePath(`/clients/${clientId}/pipeline`);
  return result;
}

export async function takeOverChat(clientId: string, conversationId: string) {
  const ctx = await requireAgency();
  const result = await takeOverConversation(ctx.agencyId, conversationId);
  if (result.ok) {
    revalidatePath(`/clients/${clientId}/inbox/${conversationId}`);
    revalidatePath(`/clients/${clientId}/inbox`);
  }
  return result;
}

export async function releaseChatToAi(clientId: string, conversationId: string) {
  const ctx = await requireAgency();
  const result = await releaseToAi(ctx.agencyId, conversationId);
  if (result.ok) {
    revalidatePath(`/clients/${clientId}/inbox/${conversationId}`);
    revalidatePath(`/clients/${clientId}/inbox`);
  }
  return result;
}

/** Permanently delete all conversations (and messages) for one website. Contacts stay. */
export async function clearWebsiteConversations(
  clientId: string,
  websiteId: string,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const ctx = await requireAgency();

  try {
    const deleted = await withAgency(ctx.agencyId, async (tx) => {
      const [site] = await tx
        .select({ id: websites.id })
        .from(websites)
        .where(
          and(eq(websites.id, websiteId), eq(websites.clientId, clientId)),
        )
        .limit(1);
      if (!site) return -1;

      const removed = await tx
        .delete(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.websiteId, websiteId),
          ),
        )
        .returning({ id: conversations.id });
      return removed.length;
    });

    if (deleted < 0) {
      return { ok: false, error: "Website not found." };
    }

    revalidatePath(`/clients/${clientId}/websites/${websiteId}/conversations`);
    revalidatePath(`/clients/${clientId}/inbox`);
    revalidatePath("/inbox");

    return { ok: true, deleted };
  } catch (e) {
    console.error("clearWebsiteConversations failed", e);
    return { ok: false, error: "Could not clear conversations." };
  }
}
