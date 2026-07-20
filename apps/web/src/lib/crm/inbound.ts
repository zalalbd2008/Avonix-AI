import { and, eq, isNull } from "drizzle-orm";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { db, withAgency } from "@/lib/db";
import { contacts, conversations, messages, replyTokens } from "@/lib/db/schema";
import type { InboundEmail } from "@/lib/email/inbound";

export type InboundResult =
  | { ok: true; conversationId: string; messageId: string }
  | { ok: false; reason: string; status: number };

/** 128 bits. This is a bearer credential for one thread. */
export function generateReplyToken() {
  return randomBytes(16).toString("hex");
}

/** The address a reply should be sent to, or null when inbound is not set up. */
export function inboundAddressFor(token: string): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN;
  if (!domain) return null;
  return `reply+${token}@${domain}`;
}

/**
 * Make sure a conversation has a reply token, and return it.
 *
 * Issued lazily, on the first outbound message, so threads that are never
 * replied to never mint a credential.
 */
export async function ensureReplyToken(
  agencyId: string,
  conversationId: string,
): Promise<string | null> {
  return withAgency(agencyId, async (tx) => {
    const [existing] = await tx
      .select({ token: replyTokens.token })
      .from(replyTokens)
      .where(and(eq(replyTokens.conversationId, conversationId), isNull(replyTokens.revokedAt)))
      .limit(1);

    if (existing) return existing.token;

    const [conversation] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    if (!conversation) return null;

    const token = generateReplyToken();
    await tx.insert(replyTokens).values({ agencyId, conversationId, token });
    return token;
  });
}

/**
 * Append an emailed reply to the thread it belongs to.
 *
 * The token is looked up in `reply_tokens`, which is deliberately not
 * tenant-scoped, because the token is what *decides* the tenant. Reading
 * `conversations` directly here returns nothing: it is scoped, and no tenant is
 * set yet. See the comment on the reply_tokens table.
 */
export async function appendInboundEmail(
  email: InboundEmail,
): Promise<InboundResult> {
  if (!email.replyToken) {
    return { ok: false, reason: "No reply token on the recipient address.", status: 422 };
  }

  // Machine mail must never land in a thread: an auto-responder answering our
  // reply, which we then reply to, is a loop that ends with a blocked domain.
  if (email.isAutomated) {
    return { ok: false, reason: "Automated message ignored.", status: 200 };
  }

  const body = email.text.trim();
  if (!body) {
    return { ok: false, reason: "Empty message ignored.", status: 200 };
  }

  const [match] = await db
    .select({
      token: replyTokens.token,
      agencyId: replyTokens.agencyId,
      conversationId: replyTokens.conversationId,
    })
    .from(replyTokens)
    .where(and(eq(replyTokens.token, email.replyToken), isNull(replyTokens.revokedAt)))
    .limit(1);

  // Same answer for an unknown token and a malformed one, so the endpoint
  // cannot be used to discover which tokens are live.
  if (!match || !tokensMatch(match.token, email.replyToken)) {
    return { ok: false, reason: "Unknown thread.", status: 202 };
  }

  const conversation = await withAgency(match.agencyId, async (tx) => {
    const [row] = await tx
      .select({
        id: conversations.id,
        agencyId: conversations.agencyId,
        contactId: conversations.contactId,
      })
      .from(conversations)
      .where(eq(conversations.id, match.conversationId))
      .limit(1);
    return row;
  });

  if (!conversation) {
    return { ok: false, reason: "Unknown thread.", status: 202 };
  }

  return withAgency(conversation.agencyId, async (tx) => {
    // Duplicate deliveries happen: providers retry when our response is slow.
    if (email.providerMessageId) {
      const [seen] = await tx
        .select({ id: messages.id })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversation.id),
            eq(messages.deliveryRef, email.providerMessageId),
          ),
        )
        .limit(1);

      if (seen) {
        return { ok: true as const, conversationId: conversation.id, messageId: seen.id };
      }
    }

    const [message] = await tx
      .insert(messages)
      .values({
        agencyId: conversation.agencyId,
        conversationId: conversation.id,
        author: "visitor",
        body: body.slice(0, 20_000),
        deliveryRef: email.providerMessageId,
      })
      .returning({ id: messages.id });

    await tx
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        // A visitor reply reopens a closed thread — someone is waiting again.
        status: "open",
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));

    // Fill in a name we did not have. Never overwrite one we did: the display
    // name on an email is attacker-controlled.
    if (conversation.contactId && email.fromName) {
      await tx
        .update(contacts)
        .set({ name: email.fromName.slice(0, 200), updatedAt: new Date() })
        .where(and(eq(contacts.id, conversation.contactId), isNull(contacts.name)));
    }

    return {
      ok: true as const,
      conversationId: conversation.id,
      messageId: message.id,
    };
  });
}

function tokensMatch(a: string | null, b: string) {
  if (!a) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
