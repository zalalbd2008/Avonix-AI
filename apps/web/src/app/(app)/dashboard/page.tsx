import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, conversations, websites } from "@/lib/db/schema";

/**
 * Route: /dashboard
 *
 * The agency-wide view. ADR-003 calls this the differentiator from a plain
 * WordPress form plugin, so it ships in v1 even though it is the least
 * feature-heavy screen: every client's leads, in one place.
 *
 * Note there is no `where agencyId = …` anywhere below. `withAgency` sets the
 * tenant for the transaction and row-level security does the filtering — ADR-002.
 */
export default async function AgencyDashboardPage() {
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [[clientCount], [websiteCount], [contactCount], [openCount], rows] =
      await Promise.all([
        tx.select({ n: count() }).from(clients),
        tx.select({ n: count() }).from(websites),
        tx.select({ n: count() }).from(contacts),
        tx
          .select({ n: count() })
          .from(conversations)
          .where(eq(conversations.status, "open")),
        // leftJoin + groupBy rather than a correlated subquery: drizzle's `sql`
        // template does not reliably correlate `clients.id` back to the outer
        // row, which silently yields 0 for every client instead of an error.
        tx
          .select({
            id: clients.id,
            name: clients.name,
            contactCount: count(contacts.id),
          })
          .from(clients)
          .leftJoin(contacts, eq(contacts.clientId, clients.id))
          .groupBy(clients.id, clients.name)
          .orderBy(clients.name)
          .limit(10),
      ]);

    return {
      clients: clientCount.n,
      websites: websiteCount.n,
      contacts: contactCount.n,
      open: openCount.n,
      rows,
    };
  });

  const metrics = [
    { label: "Clients", value: data.clients },
    { label: "Websites", value: data.websites },
    { label: "Contacts", value: data.contacts },
    { label: "Open conversations", value: data.open },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Every client's leads across ${ctx.agencyName}`}
        action={
          <Link
            href="/clients/new"
            className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + New client
          </Link>
        }
      />

      <div className="mb-5 grid grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-line bg-white p-4">
            <div className="text-2xl font-bold tracking-tight">{m.value}</div>
            <div className="mt-0.5 text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center border-b border-[#edf0f5] px-4 py-3">
          <h2 className="text-sm font-semibold">Clients</h2>
          <Link
            href="/clients"
            className="ml-auto text-[12.5px] font-semibold text-brand hover:underline"
          >
            View all →
          </Link>
        </div>

        {data.rows.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13.5px] font-medium">No clients yet</p>
            <p className="mt-1 text-[12.5px] text-muted">
              Add a client business, then connect their WordPress site.
            </p>
            <Link
              href="/clients/new"
              className="mt-3.5 inline-block rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              + New client
            </Link>
          </div>
        ) : (
          data.rows.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}` as never}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3 last:border-0 hover:bg-[#f8fafc]"
            >
              <span className="grid size-8 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-[13.5px] font-semibold">{c.name}</span>
              <span className="text-[12.5px] text-muted">
                {c.contactCount} {c.contactCount === 1 ? "contact" : "contacts"}
              </span>
              <span className="ml-auto text-[#c3ccd9]">›</span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
