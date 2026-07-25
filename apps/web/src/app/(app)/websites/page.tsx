import Link from "next/link";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, websites } from "@/lib/db/schema";

/**
 * Route: /websites
 *
 * The prototype's All Websites table: website, client, leads, status — one row
 * per site across every client.
 */
export default async function AllWebsitesPage() {
  const ctx = await requireAgency();

  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: websites.id,
        clientId: websites.clientId,
        clientName: clients.name,
        name: websites.name,
        url: websites.url,
        status: websites.status,
        leads: count(contacts.id),
      })
      .from(websites)
      .innerJoin(
        clients,
        and(eq(clients.id, websites.clientId), isNull(clients.deletedAt)),
      )
      // Leads are attributed by the site that captured them.
      .leftJoin(contacts, eq(contacts.sourceWebsiteId, websites.id))
      .where(isNull(websites.deletedAt))
      .groupBy(websites.id, clients.name)
      .orderBy(asc(clients.name), asc(websites.name)),
  );

  const dot: Record<string, string> = {
    connected: "text-ok",
    pending: "text-warn",
    disconnected: "text-bad",
  };

  return (
    <div>
      <header className="mb-[18px]">
        <h1 className="text-xl font-bold tracking-[-0.02em]">Websites</h1>
        <p className="mt-0.5 text-[13px] text-muted">All websites across every client</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No websites yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            Add a website to a client, then install the connector on it. Nothing
            arrives until then.
          </p>
          <Link href="/clients" className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline">
            Go to clients →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid grid-cols-[1.2fr_1.2fr_.6fr_.8fr] border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold tracking-[0.07em] text-faint uppercase">
            <span>Website</span>
            <span>Client</span>
            <span>Leads</span>
            <span>Status</span>
          </div>
          {rows.map((w) => (
            <Link
              key={w.id}
              href={`/clients/${w.clientId}/websites/${w.id}` as never}
              className="grid grid-cols-[1.2fr_1.2fr_.6fr_.8fr] items-center border-b border-[#f1f4f8] px-4 py-3 text-[13.5px] last:border-0 hover:bg-[#f8fafc]"
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold">
                <span className="text-[13px]">🌐</span>
                <span className="truncate">{w.name}</span>
              </span>
              <span className="truncate text-muted">{w.clientName}</span>
              <span>{w.leads}</span>
              <span
                className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${dot[w.status]}`}
              >
                <span className="size-[7px] rounded-full bg-current" />
                {w.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
