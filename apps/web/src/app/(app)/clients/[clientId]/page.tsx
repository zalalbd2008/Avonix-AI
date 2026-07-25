import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]
 *
 * Drill-down step 3: this client's websites as a grid. Open a card to enter
 * that website's workspace. Contacts/CRM live in the client sidebar, not here.
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
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);

    if (!client) return null;

    const sites = await tx
      .select({
        id: websites.id,
        name: websites.name,
        url: websites.url,
        status: websites.status,
        leads: count(contacts.id),
      })
      .from(websites)
      .leftJoin(contacts, eq(contacts.sourceWebsiteId, websites.id))
      .where(
        and(eq(websites.clientId, clientId), isNull(websites.deletedAt)),
      )
      .groupBy(websites.id)
      .orderBy(websites.name);

    return { client, sites };
  });

  if (!data) notFound();

  const dot: Record<string, string> = {
    connected: "text-ok",
    pending: "text-warn",
    disconnected: "text-bad",
  };

  const newSiteHref = `/clients/${clientId}/websites/new`;

  return (
    <div>
      <header className="mb-5 flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-[11px] bg-navy text-[17px] font-bold text-white">
          {data.client.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-[-0.02em]">{data.client.name}</h1>
          <p className="mt-px text-[13px] text-muted">
            {data.sites.length} {data.sites.length === 1 ? "Website" : "Websites"} · Client
            Workspace
          </p>
        </div>
        <Link
          href={newSiteHref as never}
          className="ml-auto shrink-0 rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
        >
          + New Website
        </Link>
      </header>

      {data.sites.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No websites yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            Add this client&apos;s WordPress site, then install the connector.
          </p>
          <Link
            href={newSiteHref as never}
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + New Website
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {data.sites.map((s) => (
            <Link
              key={s.id}
              href={`/clients/${clientId}/websites/${s.id}` as never}
              className="rounded-xl border border-line bg-white p-[18px] hover:border-brand hover:shadow-[0_8px_24px_rgba(11,30,58,.08)]"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#f1f4f8] text-[12px] font-bold text-navy">
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 truncate text-[15px] font-bold">{s.name}</span>
                <span
                  className={`ml-auto flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold capitalize ${dot[s.status]}`}
                >
                  <span className="size-[7px] rounded-full bg-current" />
                  {s.status}
                </span>
              </div>
              <div className="mb-3.5 flex gap-4 text-[12.5px] text-muted">
                <span>
                  <b className="text-ink">{s.leads}</b> {s.leads === 1 ? "Lead" : "Leads"}
                </span>
                <span className="truncate">{s.url.replace(/^https?:\/\//, "")}</span>
              </div>
              <span className="text-[13px] font-semibold text-brand">Open Workspace →</span>
            </Link>
          ))}

          <Link
            href={newSiteHref as never}
            className="grid min-h-[130px] place-items-center rounded-xl border-[1.5px] border-dashed border-[#c3ccd9] text-[13px] font-semibold text-faint hover:border-brand hover:text-brand"
          >
            + New Website
          </Link>
        </div>
      )}
    </div>
  );
}
