import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { StatusPill, timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { contacts, conversations } from "@/lib/db/schema";

/** Route: /clients/[clientId]/inbox */
export default async function ClientInboxPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: conversations.id,
        channel: conversations.channel,
        status: conversations.status,
        lastMessageAt: conversations.lastMessageAt,
        unworked: isNull(conversations.firstHumanReplyAt),
        contactName: contacts.name,
        contactEmail: contacts.email,
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(eq(conversations.clientId, clientId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(200),
  );

  const unworked = rows.filter((r) => r.unworked).length;

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={
          rows.length === 0
            ? "Chat and form conversations land here"
            : `${rows.length} conversations · ${unworked} waiting for a first reply`
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">Nothing here yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            Every form submission and chat from this client&apos;s websites opens a
            conversation here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/clients/${clientId}/inbox/${r.id}` as never}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#f8fafc]"
            >
              {/* A dot only where action is owed — a badge on every row is noise. */}
              <span
                className={`size-2 shrink-0 rounded-full ${r.unworked ? "bg-brand" : "bg-transparent"}`}
                aria-label={r.unworked ? "Not yet replied to" : undefined}
              />
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">
                  {r.contactName ?? r.contactEmail ?? "Unknown visitor"}
                </div>
                <div className="text-[12px] text-faint capitalize">{r.channel}</div>
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
