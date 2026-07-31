import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { timeAgo } from "@/components/ui/status-pill";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, websites } from "@/lib/db/schema";
import { CONNECTOR_VERSION, compareVersions } from "@/lib/connector/version";

/**
 * Route: /updates
 *
 * Agency-wide view of connector versions. Per-site remote update lives on
 * Website → Updates (queues + wakes the connector when connected).
 */
export default async function UpdatesPage() {
  const ctx = await requireAgency();

  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: websites.id,
        clientId: websites.clientId,
        clientName: clients.name,
        name: websites.name,
        status: websites.status,
        version: websites.connectorVersion,
        lastSeenAt: websites.lastSeenAt,
      })
      .from(websites)
      .innerJoin(clients, eq(clients.id, websites.clientId))
      .orderBy(asc(clients.name), asc(websites.name)),
  );

  const state = (version: string | null) => {
    if (!version) return { label: "Not reported", tone: "bg-[#f1f4f8] text-muted" };
    const diff = compareVersions(version, CONNECTOR_VERSION);
    if (diff < 0) return { label: "Update available", tone: "bg-[rgba(217,119,6,.12)] text-warn" };
    if (diff > 0) return { label: "Ahead of us", tone: "bg-[#f1f4f8] text-muted" };
    return { label: "Up to date", tone: "bg-[rgba(13,148,136,.1)] text-ok" };
  };

  const behind = rows.filter((r) => r.version && compareVersions(r.version, CONNECTOR_VERSION) < 0);

  return (
    <div>
      <PageHeader
        title="Updates"
        subtitle={`Latest connector is ${CONNECTOR_VERSION} · ${
          behind.length === 0 ? "no site is behind" : `${behind.length} behind`
        }`}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No websites yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            A site reports its connector version the first time the plugin calls
            in.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {rows.map((r) => {
            const s = state(r.version);
            return (
              <Link
                key={r.id}
                href={`/clients/${r.clientId}/websites/${r.id}` as never}
                className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#f8fafc]"
              >
                <span className="w-[52px] shrink-0 rounded-full bg-[#f1f4f8] px-2 py-[3px] text-center text-[10.5px] font-bold tracking-[0.06em] text-muted uppercase">
                  Plugin
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.name}</span>
                  <span className="block text-[12.5px] text-muted">{r.clientName}</span>
                </span>
                <span className="ml-4 shrink-0 text-[12.5px] text-faint">
                  {r.version ? `v${r.version}` : "—"}
                  {r.lastSeenAt && <> · seen {timeAgo(r.lastSeenAt)}</>}
                </span>
                <span
                  className={`ml-auto shrink-0 rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold ${s.tone}`}
                >
                  {s.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[12px] text-faint">
        Updating is done from the WordPress admin on each site. We report versions;
        we cannot push code to someone else&apos;s server.
      </p>
    </div>
  );
}
