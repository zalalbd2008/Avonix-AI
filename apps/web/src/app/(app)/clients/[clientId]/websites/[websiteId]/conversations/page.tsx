import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { StatusPill, timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { contacts, conversations, messages, websites } from "@/lib/db/schema";

type Tab = "unread" | "all" | "recent" | "starred";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/conversations
 *
 * Website-scoped team inbox — chats & form threads for this site only.
 */
export default async function WebsiteConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { clientId, websiteId } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab =
    rawTab === "unread" || rawTab === "recent" || rawTab === "starred"
      ? rawTab
      : "all";

  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id, name: websites.name })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.clientId, clientId)))
      .limit(1);
    if (!site) return null;

    const rows = await tx
      .select({
        id: conversations.id,
        channel: conversations.channel,
        status: conversations.status,
        handoffStatus: conversations.handoffStatus,
        lastMessageAt: conversations.lastMessageAt,
        unworked: sql<boolean>`${conversations.firstHumanReplyAt} is null`,
        contactName: contacts.name,
        contactEmail: contacts.email,
      })
      .from(conversations)
      .leftJoin(contacts, eq(contacts.id, conversations.contactId))
      .where(
        and(
          eq(conversations.clientId, clientId),
          eq(conversations.websiteId, websiteId),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt))
      .limit(200);

    const ids = rows.map((r) => r.id);
    const snippetById = new Map<string, string>();
    if (ids.length > 0) {
      const latest = await tx
        .select({
          conversationId: messages.conversationId,
          body: messages.body,
        })
        .from(messages)
        .where(inArray(messages.conversationId, ids))
        .orderBy(desc(messages.createdAt));
      for (const m of latest) {
        if (!snippetById.has(m.conversationId)) {
          snippetById.set(m.conversationId, m.body);
        }
      }
    }

    return {
      site,
      rows: rows.map((r) => ({
        ...r,
        snippet: snippetById.get(r.id) ?? null,
      })),
    };
  });

  if (!data) notFound();

  const { site, rows } = data;
  const unreadCount = rows.filter((r) => r.unworked).length;

  const filtered =
    tab === "unread"
      ? rows.filter((r) => r.unworked)
      : tab === "recent"
        ? rows.slice(0, 30)
        : tab === "starred"
          ? []
          : rows;

  const base = `/clients/${clientId}/websites/${websiteId}/conversations`;
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "all", label: "All", count: rows.length },
    { id: "recent", label: "Recent" },
    { id: "starred", label: "Starred" },
  ];

  return (
    <div className="-mx-6 -my-[26px] flex min-h-[calc(100vh-50px)] flex-col bg-white">
      <header className="flex items-center gap-6 border-b border-line px-6 pt-4">
        <div className="pb-3">
          <h1 className="text-[18px] font-bold tracking-tight text-ink">
            Conversations
          </h1>
          <p className="text-[12px] text-faint">{site.name}</p>
        </div>
        <nav className="flex items-end gap-1 self-stretch">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <Link
                key={t.id}
                href={`${base}?tab=${t.id}` as never}
                className={`relative px-3 pb-3 text-[13px] font-semibold transition-colors ${
                  active ? "text-[#2563eb]" : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
                {typeof t.count === "number" ? (
                  <span
                    className={`ml-1.5 rounded-md px-1.5 py-px text-[11px] font-bold ${
                      active
                        ? "bg-[#2563eb]/12 text-[#2563eb]"
                        : "bg-[#f1f4f8] text-faint"
                    }`}
                  >
                    {t.count}
                  </span>
                ) : null}
                {active ? (
                  <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#2563eb]" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-line bg-[#fafbfc]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-[13.5px] font-bold text-ink">Team inbox</p>
              <p className="text-[11.5px] text-faint">
                {filtered.length === 0
                  ? "No threads in this view"
                  : `${filtered.length} conversation${filtered.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-16 text-center">
                <p className="text-[13.5px] font-semibold text-ink">
                  {tab === "starred" ? "No starred threads yet" : "Nothing here yet"}
                </p>
                <p className="mx-auto mt-1.5 max-w-[240px] text-[12.5px] leading-relaxed text-muted">
                  {tab === "starred"
                    ? "Star a conversation from the thread view to pin it here."
                    : "Live chat and form submissions from this website land in this inbox."}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-1">
                {filtered.map((r) => {
                  const name =
                    r.contactName ?? r.contactEmail ?? "Unknown visitor";
                  const initials = initialsOf(name);
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/clients/${clientId}/inbox/${r.id}` as never}
                        className="flex gap-3 rounded-xl border border-transparent px-3 py-2.5 hover:border-[#dbeafe] hover:bg-white"
                      >
                        <span
                          className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white ${avatarTone(name)}`}
                          aria-hidden
                        >
                          {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-ink">
                              {name}
                            </span>
                            <span className="ml-auto shrink-0 text-[11.5px] text-faint">
                              {timeAgo(r.lastMessageAt)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[12.5px] text-muted">
                            {r.snippet?.trim() || `${r.channel} conversation`}
                          </p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <StatusPill value={r.status} />
                            <span className="text-[11px] capitalize text-faint">
                              {r.channel}
                            </span>
                            {r.unworked ? (
                              <span className="ml-auto rounded-md bg-[#2563eb] px-1.5 py-px text-[10.5px] font-bold text-white">
                                1
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-white px-8 text-center md:flex">
          <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a8.5 8.5 0 0 1-8.5 8.5H7l-4 2.5V12A8.5 8.5 0 1 1 21 12Z" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-ink">
            Select a conversation
          </p>
          <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted">
            Open a thread from the team inbox to reply, hand off to an agent, or
            review visitor context.
          </p>
        </section>
      </div>
    </div>
  );
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

const AVATAR_TONES = [
  "bg-[#7c6af0]",
  "bg-[#0d9488]",
  "bg-[#d97706]",
  "bg-[#2563eb]",
  "bg-[#db2777]",
  "bg-[#059669]",
];

function avatarTone(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 17) % 997;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}
