import { and, eq } from "drizzle-orm";
import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import {
  contacts,
  conversations,
  formSubmissions,
  forms,
  messages,
  websites,
} from "@/lib/db/schema";

const MAX_BODY_BYTES = 64 * 1024;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/v1/connector/submit
 *
 * A form submission from a connected site. This is the first half of the loop in
 * ADR-003: capture → inbox → pipeline.
 *
 * Contacts belong to the *client*, not the website (ADR-002 §4), so a person who
 * fills in forms on two of a client's sites is one contact with two touchpoints,
 * not two records.
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  // Per-site, so one busy site cannot exhaust another's budget.
  const limit = await rateLimit(`submit:${identity.websiteId}`, 300, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many submissions.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return connectorError("too_large", 413, "Submission too large.");
  }

  let body: {
    form_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
    page_url?: string;
    fields?: Record<string, unknown>;
    hp?: string;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  // Honeypot: a field hidden from humans. Bots fill it in. Answer 200 so the bot
  // believes it succeeded and does not retry with a different shape.
  if (typeof body.hp === "string" && body.hp.trim() !== "") {
    return Response.json({ status: "ok" });
  }

  const name = str(body.name, 200);
  const email = str(body.email, 320)?.toLowerCase();
  const phone = str(body.phone, 50);
  const message = str(body.message, 5000);

  if (!email && !phone && !name && !message) {
    return connectorError("bad_request", 400, "Submission was empty.");
  }
  if (email && !EMAIL_RE.test(email)) {
    return connectorError("bad_request", 400, "That email is not valid.");
  }

  const result = await withAgency(identity.agencyId, async (tx) => {
    // Dedupe on (client, email) — matching ADR-002 §4 and the unique index.
    // Without an email there is nothing reliable to match on, so it is a new
    // contact each time.
    let contactId: string | null = null;

    if (email) {
      const [existing] = await tx
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(eq(contacts.clientId, identity.clientId), eq(contacts.email, email)))
        .limit(1);

      if (existing) {
        contactId = existing.id;
        await tx
          .update(contacts)
          .set({ name: name ?? undefined, phone: phone ?? undefined, updatedAt: new Date() })
          .where(eq(contacts.id, existing.id));
      }
    }

    if (!contactId) {
      const [created] = await tx
        .insert(contacts)
        .values({
          agencyId: identity.agencyId,
          clientId: identity.clientId,
          sourceWebsiteId: identity.websiteId,
          name,
          email,
          phone,
          status: "new",
          fields: (body.fields ?? {}) as Record<string, unknown>,
        })
        .returning({ id: contacts.id });
      contactId = created.id;
    }

    const [conversation] = await tx
      .insert(conversations)
      .values({
        agencyId: identity.agencyId,
        clientId: identity.clientId,
        contactId,
        websiteId: identity.websiteId,
        channel: "form",
        status: "open",
        lastMessageAt: new Date(),
      })
      .returning({ id: conversations.id });

    await tx.insert(messages).values({
      agencyId: identity.agencyId,
      conversationId: conversation.id,
      author: "visitor",
      body: message ?? summarise({ name, email, phone }),
    });

    // A form_id is optional: the widget can post without one. When present it
    // must belong to this client — RLS already blocks other agencies, and the
    // clientId check stops one client's form id being used from another's site.
    if (body.form_id && UUID_RE.test(body.form_id)) {
      const [form] = await tx
        .select({ id: forms.id })
        .from(forms)
        .where(and(eq(forms.id, body.form_id), eq(forms.clientId, identity.clientId)))
        .limit(1);

      if (form) {
        await tx.insert(formSubmissions).values({
          agencyId: identity.agencyId,
          formId: form.id,
          contactId,
          websiteId: identity.websiteId,
          values: (body.fields ?? {}) as Record<string, unknown>,
          pageUrl: str(body.page_url, 2000),
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
        });
      }
    }

    await tx
      .update(websites)
      .set({ lastSeenAt: new Date() })
      .where(eq(websites.id, identity.websiteId));

    return { contactId, conversationId: conversation.id };
  });

  return Response.json({
    status: "ok",
    contact_id: result.contactId,
    conversation_id: result.conversationId,
  });
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function summarise(p: { name?: string | null; email?: string | null; phone?: string | null }) {
  const parts = [p.name, p.email, p.phone].filter(Boolean);
  return parts.length ? `Form submission — ${parts.join(" · ")}` : "Form submission";
}
