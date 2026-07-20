"use server";

import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { deliverReply } from "./deliver";
import {
  isContactStatus,
  moveContactToStage,
  replyToConversation,
  setContactStatus,
  setConversationStatus,
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
