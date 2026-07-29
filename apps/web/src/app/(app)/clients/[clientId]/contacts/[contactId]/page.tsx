import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { PageHeader } from "@/components/shell/page-header";
import { ContactStatusSelect } from "@/components/contact-status-select";
import { StatusPill, timeAgo } from "@/components/ui/status-pill";
import { listVisitorTimeline } from "@/lib/automation/timeline";
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
        ? tx
            .select({ name: websites.name })
            .from(websites)
            .where(eq(websites.id, contact.sourceWebsiteId))
            .limit(1)
        : Promise.resolve([undefined]),
    ]);

    return { contact, threads, sourceName: source?.name ?? null };
  });

  if (!data) notFound();
  const { contact, threads, sourceName } = data;
  const extra = Object.entries(contact.fields ?? {}).filter(
    ([k]) =>
      !["intent", "urgency", "interest", "aiScore", "assignee", "priority"].includes(
        k,
      ),
  );
  const fields = contact.fields ?? {};
  const timeline = await listVisitorTimeline(ctx.agencyId, contactId, 80);

  return (
    <>
      <PageHeader
        title={contact.name ?? contact.email ?? "Unnamed contact"}
        subtitle={`Captured ${timeAgo(contact.createdAt)}${sourceName ? ` from ${sourceName}` : ""}`}
        action={
          <ContactStatusSelect
            clientId={clientId}
            contactId={contactId}
            value={contact.status}
          />
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {typeof fields.intent === "string" ? (
          <Chip label={`Intent: ${fields.intent}`} tone="sky" />
        ) : null}
        {typeof fields.urgency === "string" ? (
          <Chip label={`Urgency: ${fields.urgency}`} tone="amber" />
        ) : null}
        {typeof fields.interest === "string" ? (
          <Chip label={`Interest: ${fields.interest}`} tone="rose" />
        ) : null}
        {typeof fields.aiScore === "number" ? (
          <Chip label={`Score: ${fields.aiScore}`} tone="lime" />
        ) : null}
        {typeof fields.assignee === "string" && fields.assignee ? (
          <Chip label={`Owner: ${fields.assignee}`} tone="violet" />
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr_1.1fr]">
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
            Details
          </h2>
          <dl className="px-4 py-3 text-[13px]">
            {[
              ["Email", contact.email],
              ["Phone", contact.phone],
              ["Status", contact.status],
            ].map(([k, v]) => (
              <div
                key={k as string}
                className="flex gap-3 border-b border-[#f6f8fa] py-2 last:border-0"
              >
                <dt className="w-24 shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words">
                  {(v as string) || "—"}
                </dd>
              </div>
            ))}
            {extra.map(([k, v]) => (
              <div
                key={k}
                className="flex gap-3 border-b border-[#f6f8fa] py-2 last:border-0"
              >
                <dt className="w-24 shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <h2 className="border-b border-[#edf0f5] bg-gradient-to-r from-sky-50 to-amber-50 px-4 py-3 text-sm font-semibold">
            Journey timeline
          </h2>
          <ContactTimeline items={timeline} />
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
                <span className="text-[13px] font-semibold capitalize">
                  {t.channel}
                </span>
                <span className="text-[12.5px] text-faint">
                  {timeAgo(t.lastMessageAt)}
                </span>
                <span className="ml-auto">
                  <StatusPill value={t.status} />
                </span>
              </Link>
            ))
          )}
        </section>
      </div>
    </>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "sky" | "amber" | "rose" | "lime" | "violet";
}) {
  const map = {
    sky: "bg-sky-100 text-sky-800",
    amber: "bg-amber-100 text-amber-900",
    rose: "bg-rose-100 text-rose-800",
    lime: "bg-lime-100 text-lime-900",
    violet: "bg-violet-100 text-violet-800",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${map[tone]}`}
    >
      {label}
    </span>
  );
}
