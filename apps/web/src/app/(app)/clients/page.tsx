import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies, clients, websites } from "@/lib/db/schema";
import { formatLimit, limitsFor } from "@/lib/plans";

/**
 * Route: /clients
 *
 * The active organization's client list. Opening an organization lands here —
 * each client owns its own workspace and websites (ADR-002).
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
          siteCount: count(websites.id),
        })
        .from(clients)
        .leftJoin(
          websites,
          and(eq(websites.clientId, clients.id), isNull(websites.deletedAt)),
        )
        .where(isNull(clients.deletedAt))
        .groupBy(clients.id, clients.name)
        .orderBy(clients.name),
    ]);
    return { rows, plan: agency.plan };
  });

  const limits = limitsFor(plan);
  const atLimit = rows.length >= limits.maxClients;

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Every client owns its own workspace and websites"
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
              + New Client
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
          {!atLimit && (
            <Link
              href="/clients/new"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              + Add your first client
            </Link>
          )}
          {atLimit && (
            <p className="mt-3 text-[12px] text-faint">
              {formatLimit(limits.maxClients)} clients on the {limits.label} plan —
              upgrade to add more.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {rows.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}` as never}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#f8fafc]"
            >
              <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-navy text-sm font-semibold text-white">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{c.name}</span>
                <span className="text-[12.5px] text-muted">
                  {c.siteCount} {c.siteCount === 1 ? "Website" : "Websites"}
                </span>
              </span>
              <span className="ml-auto shrink-0 text-[13px] font-semibold text-brand">
                <span className="hidden sm:inline">Open Workspace →</span>
                <span className="text-[#c3ccd9] sm:hidden">›</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
