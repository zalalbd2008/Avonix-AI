import Link from "next/link";
import { and, count, eq, gte, isNull, sql } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import {
  aiUsageDaily,
  clients,
  contacts,
  conversations,
  websites,
} from "@/lib/db/schema";

/**
 * Route: /dashboard
 *
 * The agency-wide view, laid out as the prototype's Platform Dashboard: an
 * alert strip, a metric grid, then the client list.
 *
 * The prototype's numbers were invented (uptime, malware, SMTP errors). These
 * are the equivalents this product can actually measure — ADR-001 put site
 * monitoring out of scope, so a "98.2% uptime" tile here would be a number
 * nothing computes.
 *
 * Note there is no `where agencyId = …` anywhere below. `withAgency` sets the
 * tenant for the transaction and row-level security does the filtering — ADR-002.
 */
export default async function AgencyDashboardPage() {
  const ctx = await requireAgency();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [
      [clientCount],
      [websiteCount],
      [connectedCount],
      [contactCount],
      [openCount],
      [waitingCount],
      [aiCount],
      rows,
    ] = await Promise.all([
      tx.select({ n: count() }).from(clients),
      tx.select({ n: count() }).from(websites),
      tx.select({ n: count() }).from(websites).where(eq(websites.status, "connected")),
      tx.select({ n: count() }).from(contacts),
      tx.select({ n: count() }).from(conversations).where(eq(conversations.status, "open")),
      // The number that matters most: someone asked and nobody has answered.
      tx
        .select({ n: count() })
        .from(conversations)
        .where(
          and(eq(conversations.status, "open"), isNull(conversations.firstHumanReplyAt)),
        ),
      tx
        .select({ n: sql<number>`coalesce(sum(${aiUsageDaily.requests}), 0)`.mapWith(Number) })
        .from(aiUsageDaily)
        .where(gte(aiUsageDaily.day, monthStart.toISOString().slice(0, 10))),
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
      connected: connectedCount.n,
      contacts: contactCount.n,
      open: openCount.n,
      waiting: waitingCount.n,
      ai: aiCount.n,
      rows,
    };
  });

  const pending = data.websites - data.connected;

  const metrics: { value: string; label: string; tone?: string }[] = [
    { value: String(data.clients), label: "Clients" },
    { value: String(data.websites), label: "Websites" },
    { value: String(data.contacts), label: "Leads captured" },
    {
      value: `${data.connected}/${data.websites}`,
      label: "Connected",
      tone: data.websites === 0 ? undefined : pending > 0 ? "text-warn" : "text-ok",
    },
    { value: String(data.open), label: "Open conversations" },
    {
      value: String(data.waiting),
      label: "Waiting for a reply",
      tone: data.waiting > 0 ? "text-bad" : "text-ok",
    },
    { value: data.ai.toLocaleString(), label: "AI replies this month" },
  ];

  // Only real problems. An alert bar that is always on is wallpaper.
  // Noun phrases, so they still read as English joined by "and … need attention".
  const alerts: string[] = [];
  if (data.waiting > 0) {
    alerts.push(`${data.waiting} ${data.waiting === 1 ? "lead" : "leads"} with no reply`);
  }
  if (pending > 0) {
    alerts.push(
      `${pending} ${pending === 1 ? "website" : "websites"} waiting for the plugin`,
    );
  }

  return (
    <div>
      <header className="mb-[18px] flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em]">Dashboard</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Every client&apos;s leads across {ctx.agencyName}
          </p>
        </div>
        <Link
          href={"/launchpad" as never}
          className="text-[12.5px] font-semibold text-brand hover:underline"
        >
          Launchpad →
        </Link>
      </header>

      {alerts.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#ffd9bd] bg-[#fff8f3] px-3.5 py-[11px] text-[13px]">
          <span className="size-2 shrink-0 rounded-full bg-bad" />
          <span className="min-w-0 flex-1">
            {alerts.map((a, i) => (
              <span key={a}>
                {i > 0 && " and "}
                <b>{a}</b>
              </span>
            ))}{" "}
            need attention
          </span>
          <Link
            href={
              data.waiting > 0
                ? "/inbox"
                : (("/launchpad" as never))
            }
            className="shrink-0 font-semibold text-brand hover:underline sm:ml-auto"
          >
            {data.waiting > 0 ? "Review →" : "Continue setup →"}
          </Link>
        </div>
      )}

      <div className="mb-[22px] grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-[10px] border border-line bg-white px-4 pt-4 pb-3.5"
          >
            <div className={`text-2xl font-bold tracking-[-0.02em] ${m.tone ?? ""}`}>
              {m.value}
            </div>
            <div className="mt-[3px] text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center border-b border-[#edf0f5] px-4 py-[13px]">
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
              Use Launchpad for step-by-step client and website setup.
            </p>
            <Link
              href={"/launchpad" as never}
              className="mt-3.5 inline-block rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
            >
              Open Launchpad
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
    </div>
  );
}
