import Link from "next/link";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { agencies, clients, contacts, websites } from "@/lib/db/schema";
import { formatLimit, limitsFor } from "@/lib/plans";
import {
  ClientsDirectory,
  type ClientListItem,
} from "./clients-directory";

/**
 * Route: /clients
 *
 * The active organization's client directory. Opening an organization lands
 * here — each client owns its own workspace and websites (ADR-002).
 */
export default async function ClientsPage() {
  const ctx = await requireAgency();

  const { rows, plan } = await withAgency(ctx.agencyId, async (tx) => {
    const [[agency], rows] = await Promise.all([
      tx
        .select({ plan: agencies.plan })
        .from(agencies)
        .where(eq(agencies.id, ctx.agencyId))
        .limit(1),
      tx
        .select({
          id: clients.id,
          name: clients.name,
          contactEmail: clients.contactEmail,
          contactPhone: clients.contactPhone,
          createdAt: clients.createdAt,
          siteCount: count(websites.id),
          connectedCount: sql<number>`coalesce(sum(case when ${websites.status} = 'connected' and ${websites.deletedAt} is null then 1 else 0 end), 0)`.mapWith(
            Number,
          ),
        })
        .from(clients)
        .leftJoin(
          websites,
          and(eq(websites.clientId, clients.id), isNull(websites.deletedAt)),
        )
        .where(isNull(clients.deletedAt))
        .groupBy(
          clients.id,
          clients.name,
          clients.contactEmail,
          clients.contactPhone,
          clients.createdAt,
        )
        .orderBy(clients.name),
    ]);

    const contactRows = await tx
      .select({
        clientId: contacts.clientId,
        n: count(),
      })
      .from(contacts)
      .where(isNull(contacts.deletedAt))
      .groupBy(contacts.clientId);

    const contactMap = new Map(contactRows.map((r) => [r.clientId, r.n]));

    return {
      rows: rows.map((r) => ({
        ...r,
        contactCount: contactMap.get(r.id) ?? 0,
      })),
      plan: agency.plan,
    };
  });

  const limits = limitsFor(plan);
  const atLimit = rows.length >= limits.maxClients;

  const items: ClientListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    contactEmail: r.contactEmail,
    contactPhone: r.contactPhone,
    siteCount: Number(r.siteCount) || 0,
    connectedCount: Number(r.connectedCount) || 0,
    contactCount: Number(r.contactCount) || 0,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt),
  }));

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${ctx.agencyName} · each client is a separate workspace`}
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

      {items.length === 0 ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="border-b border-[#edf0f5] bg-[linear-gradient(135deg,#fff8f3_0%,#f8fafc_55%,#fff_100%)] px-6 py-10 sm:px-10">
            <p className="text-[11px] font-bold tracking-[0.08em] text-brand uppercase">
              Client directory
            </p>
            <h2 className="mt-2 max-w-md text-xl font-bold tracking-[-0.02em] text-ink">
              Add your first client workspace
            </h2>
            <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-muted">
              A client is one business you manage. Their websites, contacts,
              inbox and pipeline all live inside this workspace.
            </p>
            {!atLimit ? (
              <Link
                href="/clients/new"
                className="mt-5 inline-flex rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
              >
                + Add your first client
              </Link>
            ) : (
              <p className="mt-4 text-[12.5px] text-faint">
                {formatLimit(limits.maxClients)} clients on the {limits.label}{" "}
                plan — upgrade to add more.
              </p>
            )}
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            {[
              {
                title: "Websites",
                body: "Connect WordPress sites under each client.",
              },
              {
                title: "Leads & CRM",
                body: "Contacts and pipeline stay scoped to the client.",
              },
              {
                title: "Team access",
                body: "Work from one directory across every account.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border-t border-[#edf0f5] px-5 py-4 sm:border-t-0 sm:border-l sm:first:border-l-0"
              >
                <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                <p className="mt-1 text-[12.5px] text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ClientsDirectory
          clients={items}
          atLimit={atLimit}
          planLabel={limits.label}
          maxClients={limits.maxClients}
        />
      )}
    </div>
  );
}
