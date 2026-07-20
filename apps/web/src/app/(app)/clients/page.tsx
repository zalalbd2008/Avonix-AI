import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies, clients, contacts, websites } from "@/lib/db/schema";
import { formatLimit, limitsFor } from "@/lib/plans";

/**
 * Route: /clients
 *
 * Every client business this agency manages. No `where agencyId = …` anywhere —
 * `withAgency` sets the tenant and RLS filters the rows (ADR-002).
 */
export default async function ClientsPage() {
  const ctx = await requireAgency();

  const { rows, plan } = await withAgency(ctx.agencyId, async (tx) => {
    const [[agency], rows] = await Promise.all([
      tx.select({ plan: agencies.plan }).from(agencies).where(eq(agencies.id, ctx.agencyId)).limit(1),
      tx
        .select({
          id: clients.id,
          name: clients.name,
          contactEmail: clients.contactEmail,
          contactCount: count(contacts.id),
        })
        .from(clients)
        .leftJoin(contacts, eq(contacts.clientId, clients.id))
        .groupBy(clients.id, clients.name, clients.contactEmail)
        .orderBy(clients.name),
    ]);
    return { rows, plan: agency.plan };
  });

  // Second query rather than a three-way join: joining contacts and websites at
  // once multiplies the rows and inflates both counts.
  const siteCounts = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ clientId: websites.clientId, n: count(websites.id) })
      .from(websites)
      .groupBy(websites.clientId),
  );
  const sitesByClient = new Map(siteCounts.map((s) => [s.clientId, s.n]));

  const limits = limitsFor(plan);
  const atLimit = rows.length >= limits.maxClients;

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${rows.length} of ${formatLimit(limits.maxClients)} on the ${limits.label} plan`}
        action={
          atLimit ? (
            <Link
              href="/billing"
              className="rounded-lg border-[1.5px] border-brand px-3.5 py-2 text-[13px] font-semibold text-brand hover:bg-brand hover:text-white"
            >
              Upgrade to add more
            </Link>
          ) : (
            <Link
              href="/clients/new"
              className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              + New client
            </Link>
          )
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No clients yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            A client is one business you work for. Their websites, contacts and
            pipeline all live inside it.
          </p>
          <Link
            href="/clients/new"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + Add your first client
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid grid-cols-[1.6fr_1fr_.5fr_.5fr] border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold tracking-[0.07em] text-faint uppercase">
            <span>Client</span>
            <span>Contact</span>
            <span>Sites</span>
            <span>Contacts</span>
          </div>
          {rows.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}` as never}
              className="grid grid-cols-[1.6fr_1fr_.5fr_.5fr] items-center border-b border-[#f1f4f8] px-4 py-3 text-[13.5px] last:border-0 hover:bg-[#f8fafc]"
            >
              <span className="flex items-center gap-2.5 font-semibold">
                <span className="grid size-8 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                {c.name}
              </span>
              <span className="text-[12.5px] text-muted">{c.contactEmail ?? "—"}</span>
              <span>{sitesByClient.get(c.id) ?? 0}</span>
              <span>{c.contactCount}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
