import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  cepWidgets,
  defaultCepWidgetPayload,
  forms,
  type CepWidget,
  type CepWidgetPayload,
  type CepWidgetStatus,
  type CepWidgetSurface,
  type FormField,
  type FormSettings,
} from "@/lib/db/schema";
import { embedSnippet } from "@/lib/forms/fields";

function slugify(name: string) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "chat"
  );
}

export async function listCepWidgets(agencyId: string, websiteId: string) {
  return withAgency(agencyId, (tx) =>
    tx
      .select()
      .from(cepWidgets)
      .where(
        and(
          eq(cepWidgets.websiteId, websiteId),
          isNull(cepWidgets.deletedAt),
        ),
      )
      .orderBy(asc(cepWidgets.priorityRank), asc(cepWidgets.createdAt)),
  );
}

export async function getPublishedWidgetConfig(
  agencyId: string,
  websiteId: string,
  surface: CepWidgetSurface = "bubble",
) {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select()
      .from(cepWidgets)
      .where(
        and(
          eq(cepWidgets.websiteId, websiteId),
          eq(cepWidgets.status, "published"),
          eq(cepWidgets.isEnabled, true),
          eq(cepWidgets.surface, surface),
          isNull(cepWidgets.deletedAt),
        ),
      )
      .orderBy(asc(cepWidgets.priorityRank))
      .limit(1);
    return row ?? null;
  });
}

/** @deprecated use getPublishedWidgetConfig(..., "bubble") */
export async function getPublishedBubbleConfig(
  agencyId: string,
  websiteId: string,
) {
  return getPublishedWidgetConfig(agencyId, websiteId, "bubble");
}

export async function ensureDefaultBubbleWidget(opts: {
  agencyId: string;
  clientId: string;
  websiteId: string;
  websiteName: string;
}): Promise<CepWidget> {
  const existing = await listCepWidgets(opts.agencyId, opts.websiteId);
  const bubble = existing.find((w) => w.surface === "bubble");
  if (bubble) return bubble;

  return withAgency(opts.agencyId, async (tx) => {
    const [row] = await tx
      .insert(cepWidgets)
      .values({
        agencyId: opts.agencyId,
        clientId: opts.clientId,
        websiteId: opts.websiteId,
        name: `${opts.websiteName} Chat`,
        slug: slugify(`${opts.websiteName}-chat`),
        status: "published",
        surface: "bubble",
        isEnabled: true,
        payload: defaultCepWidgetPayload("bubble"),
      })
      .returning();
    return row!;
  });
}

export async function saveCepWidget(opts: {
  agencyId: string;
  clientId: string;
  websiteId: string;
  id?: string;
  name: string;
  status: CepWidgetStatus;
  surface: CepWidgetSurface;
  isEnabled: boolean;
  payload: CepWidgetPayload;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const name = opts.name.trim();
  if (!name) return { ok: false, error: "Name is required." };

  return withAgency(opts.agencyId, async (tx) => {
    if (opts.id) {
      const [row] = await tx
        .update(cepWidgets)
        .set({
          name,
          status: opts.status,
          surface: opts.surface,
          isEnabled: opts.isEnabled,
          payload: opts.payload,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(cepWidgets.id, opts.id),
            eq(cepWidgets.websiteId, opts.websiteId),
            isNull(cepWidgets.deletedAt),
          ),
        )
        .returning({ id: cepWidgets.id });
      if (!row) return { ok: false as const, error: "Widget not found." };
      return { ok: true as const, id: row.id };
    }

    const [row] = await tx
      .insert(cepWidgets)
      .values({
        agencyId: opts.agencyId,
        clientId: opts.clientId,
        websiteId: opts.websiteId,
        name,
        slug: slugify(name),
        status: opts.status,
        surface: opts.surface,
        isEnabled: opts.isEnabled,
        payload: opts.payload,
      })
      .returning({ id: cepWidgets.id });
    return { ok: true as const, id: row!.id };
  });
}

/** Resolve Form Builder embed HTML for in-chat lead_form blocks. */
export async function getLeadFormEmbed(
  agencyId: string,
  clientId: string,
  formId: string,
): Promise<{ formId: string; title: string; html: string } | null> {
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select({
        id: forms.id,
        name: forms.name,
        formNumber: forms.formNumber,
        fields: forms.fields,
        settings: forms.settings,
        submitLabel: forms.submitLabel,
        successMessage: forms.successMessage,
      })
      .from(forms)
      .where(
        and(
          eq(forms.id, formId),
          eq(forms.clientId, clientId),
          isNull(forms.deletedAt),
        ),
      )
      .limit(1);
    if (!row) return null;

    const html = embedSnippet({
      id: row.id,
      formNumber: row.formNumber ?? undefined,
      fields: (row.fields ?? []) as FormField[],
      settings: (row.settings ?? null) as FormSettings | null,
      submitLabel: row.submitLabel || "Submit",
      successMessage: row.successMessage ?? undefined,
    });

    return { formId: row.id, title: row.name, html };
  });
}

export async function listMessagesAfter(opts: {
  agencyId: string;
  websiteId: string;
  conversationId: string;
  afterCreatedAt?: Date | null;
}) {
  const { conversations, messages } = await import("@/lib/db/schema");
  return withAgency(opts.agencyId, async (tx) => {
    const [conv] = await tx
      .select({
        id: conversations.id,
        handoffStatus: conversations.handoffStatus,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, opts.conversationId),
          eq(conversations.websiteId, opts.websiteId),
        ),
      )
      .limit(1);
    if (!conv) return { conversation: null, messages: [] as const };

    const rows = opts.afterCreatedAt
      ? await tx
          .select({
            id: messages.id,
            author: messages.author,
            body: messages.body,
            blocks: messages.blocks,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, opts.conversationId),
              gt(messages.createdAt, opts.afterCreatedAt),
            ),
          )
          .orderBy(asc(messages.createdAt))
          .limit(50)
      : await tx
          .select({
            id: messages.id,
            author: messages.author,
            body: messages.body,
            blocks: messages.blocks,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, opts.conversationId))
          .orderBy(asc(messages.createdAt))
          .limit(50);

    return {
      conversation: conv,
      messages: rows,
    };
  });
}

export async function setConversationHandoff(
  agencyId: string,
  conversationId: string,
  handoffStatus: "ai" | "queued" | "agent",
) {
  const { conversations } = await import("@/lib/db/schema");
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .update(conversations)
      .set({
        handoffStatus,
        // New queue wait should be eligible for chat_missed again.
        ...(handoffStatus === "queued"
          ? { missedChatAlertedAt: null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning({ id: conversations.id, handoffStatus: conversations.handoffStatus });
    return row ?? null;
  });
}

export async function getConversationHandoff(
  agencyId: string,
  conversationId: string,
) {
  const { conversations } = await import("@/lib/db/schema");
  return withAgency(agencyId, async (tx) => {
    const [row] = await tx
      .select({
        id: conversations.id,
        handoffStatus: conversations.handoffStatus,
        websiteId: conversations.websiteId,
        clientId: conversations.clientId,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    return row ?? null;
  });
}

export async function listQueuedChatConversations(
  agencyId: string,
  clientId: string,
  limit = 40,
) {
  const { conversations, contacts, websites } = await import("@/lib/db/schema");
  return withAgency(agencyId, (tx) =>
    tx
      .select({
        id: conversations.id,
        handoffStatus: conversations.handoffStatus,
        lastMessageAt: conversations.lastMessageAt,
        websiteId: conversations.websiteId,
        websiteName: websites.name,
        contactName: contacts.name,
        contactEmail: contacts.email,
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .leftJoin(websites, eq(websites.id, conversations.websiteId))
      .where(
        and(
          eq(conversations.clientId, clientId),
          eq(conversations.channel, "chat"),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(limit),
  );
}
