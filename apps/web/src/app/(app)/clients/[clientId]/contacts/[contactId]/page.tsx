import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { ContactStatusSelect } from "@/components/contact-status-select";
import { StatusPill, timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { contacts, conversations, websites } from "@/lib/db/schema";

/** Route: /clients/[clientId]/contacts/[contactId] */
export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ clientId: string; contactId: string }>;
}) {
  const { clientId, contactId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [contact] = await tx
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .limit(1);
    if (!contact) return null;

    const [threads, [source]] = await Promise.all([
      tx
        .select({
          id: conversations.id,
          channel: conversations.channel,
          status: conversations.status,
          lastMessageAt: conversations.lastMessageAt,
        })
        .from(conversations)
        .where(eq(conversations.contactId, contactId))
        .orderBy(desc(conversations.lastMessageAt)),
      contact.sourceWebsiteId
        ? tx.select({ name: websites.name }).from(websites).where(eq(websites.id, contact.sourceWebsiteId)).limit(1)
        : Promise.resolve([undefined]),
    ]);

    return { contact, threads, sourceName: source?.name ?? null };
  });

  if (!data) notFound();
  const { contact, threads, sourceName } = data;
  const extra = Object.entries(contact.fields ?? {});

  return (
    <>
      <PageHeader
        title={contact.name ?? contact.email ?? "Unnamed contact"}
        subtitle={`Captured ${timeAgo(contact.createdAt)}${sourceName ? ` from ${sourceName}` : ""}`}
        action={<ContactStatusSelect clientId={clientId} contactId={contactId} value={contact.status} />}
      />

      <div className="grid grid-cols-[1fr_1.2fr] gap-4">
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">Details</h2>
          <dl className="px-4 py-3 text-[13px]">
            {[
              ["Email", contact.email],
              ["Phone", contact.phone],
              ["Status", contact.status],
            ].map(([k, v]) => (
              <div key={k as string} className="flex gap-3 border-b border-[#f6f8fa] py-2 last:border-0">
                <dt className="w-24 shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{(v as string) || "—"}</dd>
              </div>
            ))}
            {extra.map(([k, v]) => (
              <div key={k} className="flex gap-3 border-b border-[#f6f8fa] py-2 last:border-0">
                <dt className="w-24 shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
            Conversations
          </h2>
          {threads.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-muted">
              Nothing yet.
            </p>
          ) : (
            threads.map((t) => (
              <Link
                key={t.id}
                href={`/clients/${clientId}/inbox/${t.id}` as never}
                className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3 last:border-0 hover:bg-[#f8fafc]"
              >
                <span className="text-[13px] font-semibold capitalize">{t.channel}</span>
                <span className="text-[12.5px] text-faint">{timeAgo(t.lastMessageAt)}</span>
                <span className="ml-auto"><StatusPill value={t.status} /></span>
              </Link>
            ))
          )}
        </section>
      </div>
    </>
  );
}
