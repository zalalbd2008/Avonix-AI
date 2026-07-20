import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, conversations, websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]
 *
 * Note what is *not* here: no check that this client belongs to the caller's
 * agency. Under `withAgency`, a client id from another agency simply returns no
 * row and this renders a 404 — the same answer an id that does not exist gets,
 * which is also the right answer to give someone probing for valid ids.
 */
export default async function ClientOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client) return null;

    const [sites, [contactCount], [conversationCount], recent] =
      await Promise.all([
        tx
          .select({
            id: websites.id,
            name: websites.name,
            url: websites.url,
            status: websites.status,
          })
          .from(websites)
          .where(eq(websites.clientId, clientId))
          .orderBy(websites.name),
        tx
          .select({ n: count() })
          .from(contacts)
          .where(eq(contacts.clientId, clientId)),
        tx
          .select({ n: count() })
          .from(conversations)
          .where(eq(conversations.clientId, clientId)),
        tx
          .select({
            id: contacts.id,
            name: contacts.name,
            email: contacts.email,
            status: contacts.status,
          })
          .from(contacts)
          .where(eq(contacts.clientId, clientId))
          .orderBy(desc(contacts.createdAt))
          .limit(5),
      ]);

    return {
      client,
      sites,
      contactCount: contactCount.n,
      conversationCount: conversationCount.n,
      recent,
    };
  });

  if (!data) notFound();

  const statusStyle: Record<string, string> = {
    connected: "text-ok",
    pending: "text-warn",
    disconnected: "text-bad",
  };

  return (
    <>
      <PageHeader
        title={data.client.name}
        subtitle={data.client.contactEmail ?? "No contact email yet"}
        action={
          <Link
            href={`/clients/${clientId}/websites/new` as never}
            className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + Add website
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { label: "Websites", value: data.sites.length },
          { label: "Contacts", value: data.contactCount },
          { label: "Conversations", value: data.conversationCount },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-line bg-white p-4">
            <div className="text-2xl font-bold tracking-tight">{m.value}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
            Websites
          </h2>
          {data.sites.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-muted">
              No websites connected yet. Add one to start capturing leads.
            </p>
          ) : (
            data.sites.map((s) => (
              <Link
                key={s.id}
                href={`/clients/${clientId}/websites/${s.id}` as never}
                className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3 last:border-0 hover:bg-[#f8fafc]"
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">{s.name}</div>
                  <div className="truncate text-[12px] text-faint">{s.url}</div>
                </div>
                <span
                  className={`ml-auto text-[11.5px] font-semibold ${statusStyle[s.status]}`}
                >
                  {s.status}
                </span>
              </Link>
            ))
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center border-b border-[#edf0f5] px-4 py-3">
            <h2 className="text-sm font-semibold">Recent contacts</h2>
            <Link
              href={`/clients/${clientId}/contacts` as never}
              className="ml-auto text-[12.5px] font-semibold text-brand hover:underline"
            >
              View all →
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-muted">
              No contacts yet. They arrive when someone fills a form or opens the
              chat widget.
            </p>
          ) : (
            data.recent.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${clientId}/contacts/${c.id}` as never}
                className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3 last:border-0 hover:bg-[#f8fafc]"
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] font-semibold">
                    {c.name ?? c.email ?? "Unnamed"}
                  </div>
                  <div className="truncate text-[12px] text-faint">{c.email}</div>
                </div>
                <span className="ml-auto rounded-full bg-[#f1f4f8] px-2.5 py-0.5 text-[11.5px] font-semibold text-muted">
                  {c.status}
                </span>
              </Link>
            ))
          )}
        </section>
      </div>
    </>
  );
}
