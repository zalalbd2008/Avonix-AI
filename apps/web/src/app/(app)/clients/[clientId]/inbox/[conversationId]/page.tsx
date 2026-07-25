import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { AgentChatConsole } from "@/components/cep/agent-chat-console";
import { DeliveryBadge } from "@/components/delivery-badge";
import { StatusPill, timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { contacts, conversations, messages } from "@/lib/db/schema";

/** Route: /clients/[clientId]/inbox/[conversationId] */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ clientId: string; conversationId: string }>;
}) {
  const { clientId, conversationId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [conversation] = await tx
      .select({
        id: conversations.id,
        channel: conversations.channel,
        status: conversations.status,
        handoffStatus: conversations.handoffStatus,
        contactId: conversations.contactId,
        contactName: contacts.name,
        contactEmail: contacts.email,
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conversation) return null;

    const thread = await tx
      .select({
        id: messages.id,
        author: messages.author,
        body: messages.body,
        createdAt: messages.createdAt,
        delivery: messages.delivery,
        deliveredAt: messages.deliveredAt,
        deliveryError: messages.deliveryError,
      })
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));

    return { conversation, thread };
  });

  if (!data) notFound();
  const { conversation, thread } = data;

  const bubble: Record<string, string> = {
    visitor: "bg-white border border-line",
    ai: "bg-[#f0fdf9] border border-[#bfe9e2]",
    agent: "bg-brand text-white ml-auto",
    system: "bg-[#f1f4f8] text-muted text-[12px] mx-auto",
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={
          conversation.contactName ?? conversation.contactEmail ?? "Conversation"
        }
        subtitle={`${conversation.channel} conversation`}
        action={
          <div className="flex items-center gap-3">
            <StatusPill value={conversation.status} />
            {conversation.contactId && (
              <Link
                href={
                  `/clients/${clientId}/contacts/${conversation.contactId}` as never
                }
                className="text-[13px] font-semibold text-brand hover:underline"
              >
                View contact →
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        {thread.map((m) => (
          <div
            key={m.id}
            className={`max-w-[80%] rounded-xl px-3.5 py-2.5 ${bubble[m.author]}`}
          >
            <div className="text-[13px] whitespace-pre-wrap">{m.body}</div>
            <div
              className={`mt-1 text-[11px] ${m.author === "agent" ? "text-white/70" : "text-faint"}`}
            >
              {m.author} · {timeAgo(m.createdAt)}{" "}
              {m.author === "agent" && (
                <DeliveryBadge
                  delivery={m.delivery}
                  deliveredAt={m.deliveredAt}
                  error={m.deliveryError}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <AgentChatConsole
        clientId={clientId}
        conversationId={conversationId}
        status={conversation.status}
        handoffStatus={conversation.handoffStatus}
        channel={conversation.channel}
        deliversTo={conversation.contactEmail}
      />
    </div>
  );
}
