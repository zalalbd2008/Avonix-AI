import { eq } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { clients, contacts, conversations, messages } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { agencyReplyEmail } from "@/lib/email/templates/agency-reply";

export type DeliveryOutcome =
  | { delivered: true }
  | { delivered: false; reason: string; permanent: boolean };

/**
 * Send an agent's reply to the person outside, and record what happened.
 *
 * Delivery is attempted *after* the message is stored, never instead of it. If
 * the send fails, the agency still has a record of what they wrote and a visible
 * failure to act on — losing the text because an SMTP call timed out would be
 * the worse failure.
 *
 * Kept out of `replyToConversation` on purpose: storing a message is a database
 * concern that must not depend on a third party being reachable.
 */
export async function deliverReply(
  agencyId: string,
  messageId: string,
): Promise<DeliveryOutcome> {
  const context = await withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select({
        body: messages.body,
        conversationId: messages.conversationId,
        channel: conversations.channel,
        contactEmail: contacts.email,
        contactName: contacts.name,
        clientName: clients.name,
        clientEmail: clients.contactEmail,
      })
      .from(messages)
      .innerJoin(conversations, eq(conversations.id, messages.conversationId))
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .innerJoin(clients, eq(clients.id, conversations.clientId))
      .where(eq(messages.id, messageId))
      .limit(1);
    return row;
  });

  if (!context) {
    return { delivered: false, reason: "Message not found.", permanent: true };
  }

  // No address is not a failure — it is simply a thread that cannot be answered
  // by email. Saying "failed" would imply something is broken and retryable.
  if (!context.contactEmail) {
    await mark(agencyId, messageId, {
      delivery: "not_applicable",
      deliveryError:
        context.channel === "chat"
          ? "This visitor never left an email address."
          : "This contact has no email address.",
    });
    return {
      delivered: false,
      reason: "No email address for this contact.",
      permanent: true,
    };
  }

  await mark(agencyId, messageId, { delivery: "pending" });

  try {
    const result = await sendEmail(
      agencyReplyEmail({
        to: context.contactEmail,
        contactName: context.contactName,
        clientName: context.clientName,
        body: context.body,
        // Replies land in the client's own mailbox. Inbound capture — pulling
        // the answer back into this thread — is not built yet, so sending the
        // visitor somewhere a human actually reads beats a dead no-reply address.
        replyTo: context.clientEmail,
      }),
    );

    await mark(agencyId, messageId, {
      delivery: "sent",
      deliveredAt: new Date(),
      deliveryRef: result.id ?? null,
      deliveryError: null,
    });
    return { delivered: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    await mark(agencyId, messageId, {
      delivery: "failed",
      deliveryError: reason.slice(0, 500),
    });
    return { delivered: false, reason, permanent: false };
  }
}

async function mark(
  agencyId: string,
  messageId: string,
  patch: Partial<{
    delivery: "not_applicable" | "pending" | "sent" | "failed";
    deliveredAt: Date | null;
    deliveryRef: string | null;
    deliveryError: string | null;
  }>,
) {
  await withAgency(agencyId, (tx) =>
    tx.update(messages).set(patch).where(eq(messages.id, messageId)),
  );
}
