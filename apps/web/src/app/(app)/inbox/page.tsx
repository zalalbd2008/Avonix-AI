import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { StatusPill, timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, conversations } from "@/lib/db/schema";

/**
 * Route: /inbox
 *
 * Every client's conversations in one list. This is the screen a plain
 * WordPress form plugin cannot produce, and ADR-003 names it as the reason an
 * agency pays — so unanswered threads sort to the top regardless of client.
 */
export default async function AgencyInboxPage() {
  const ctx = await requireAgency();

  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: conversations.id,
        clientId: conversations.clientId,
        clientName: clients.name,
        channel: conversations.channel,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
        unworked: isNull(conversations.firstHumanReplyAt),
        contactName: contacts.name,
        contactEmail: contacts.email,
      })
      .from(conversations)
      .innerJoin(clients, eq(clients.id, conversations.clientId))
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(eq(conversations.status, "open"))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(200),
  );

  const waiting = rows.filter((r) => r.unworked);
  const rest = rows.filter((r) => !r.unworked);
  const ordered = [...waiting, ...rest];

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={
          rows.length === 0
            ? "Open conversations across every client"
            : `${waiting.length} waiting for a first reply · ${rows.length} open in total`
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">Nothing waiting</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            Open conversations from every client&apos;s websites collect here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {ordered.map((r) => (
            <Link
              key={r.id}
              href={`/clients/${r.clientId}/inbox/${r.id}` as never}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#f8fafc]"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${r.unworked ? "bg-brand" : "bg-transparent"}`}
                aria-label={r.unworked ? "Not yet replied to" : undefined}
              />
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">
                  {r.contactName ?? r.contactEmail ?? "Unknown visitor"}
                </div>
                <div className="text-[12px] text-faint">
                  {r.clientName} · {r.channel}
                </div>
              </div>
              <span className="ml-auto text-[12.5px] text-faint">{timeAgo(r.lastMessageAt)}</span>
              <StatusPill value={r.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
