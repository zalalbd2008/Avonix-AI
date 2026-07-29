import Link from "next/link";
import { asc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { timeAgo } from "@/components/ui/status-pill";
import { ScrollTable } from "@/components/ui/scroll-table";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, connectorKeys, websites } from "@/lib/db/schema";

/**
 * Route: /licenses
 *
 * The prototype's Licenses screen, in the form this product actually has one:
 * a connector key is the thing that authorises a site to send us data, and it
 * is issued, revoked and rotated exactly like a licence.
 *
 * Only the prefix is ever shown. The full key exists as a sha256 hash and
 * nothing else, so there is no version of this page that could display it.
 */
export default async function LicensesPage() {
  const ctx = await requireAgency();

  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        keyId: connectorKeys.id,
        prefix: connectorKeys.prefix,
        issued: connectorKeys.createdAt,
        lastUsedAt: connectorKeys.lastUsedAt,
        websiteId: websites.id,
        websiteName: websites.name,
        websiteStatus: websites.status,
        clientId: clients.id,
        clientName: clients.name,
      })
      .from(connectorKeys)
      .innerJoin(websites, eq(websites.id, connectorKeys.websiteId))
      .innerJoin(clients, eq(clients.id, websites.clientId))
      .where(isNull(connectorKeys.revokedAt))
      .orderBy(asc(clients.name), asc(websites.name)),
  );

  const used = rows.filter((r) => r.lastUsedAt).length;

  return (
    <div>
      <PageHeader
        title="Licenses"
        subtitle={
          rows.length === 0
            ? "One connector key per website — the licence that lets a site send you data"
            : `${rows.length} active · ${used} have been used at least once`
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No keys issued yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            A key is minted automatically when you add a website. It is shown once
            and stored only as a hash.
          </p>
          <Link
            href="/clients"
            className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline"
          >
            Go to clients →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((r) => (
              <Link
                key={r.keyId}
                href={`/clients/${r.clientId}/websites/${r.websiteId}/settings` as never}
                className="rounded-xl border border-line bg-white p-4 hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-2 font-semibold">
                      <span
                        className={`size-[7px] shrink-0 rounded-full ${
                          r.websiteStatus === "connected" ? "bg-ok" : "bg-warn"
                        }`}
                      />
                      <span className="truncate">{r.websiteName}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-muted">
                      {r.clientName}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[12px] text-faint">
                    {r.prefix}…
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-faint">
                  Last used {r.lastUsedAt ? timeAgo(r.lastUsedAt) : "never"}
                </p>
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            <ScrollTable minWidth={640}>
              <div className="grid grid-cols-[1fr_1fr_.9fr_.7fr] border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold tracking-[0.07em] text-faint uppercase">
                <span>Key</span>
                <span>Website</span>
                <span>Client</span>
                <span>Last used</span>
              </div>
              {rows.map((r) => (
                <Link
                  key={r.keyId}
                  href={`/clients/${r.clientId}/websites/${r.websiteId}/settings` as never}
                  className="grid grid-cols-[1fr_1fr_.9fr_.7fr] items-center border-b border-[#f1f4f8] px-4 py-3 text-[13.5px] last:border-0 hover:bg-[#f8fafc]"
                >
                  <span className="font-mono text-[12.5px]">{r.prefix}…</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`size-[7px] shrink-0 rounded-full ${
                        r.websiteStatus === "connected" ? "bg-ok" : "bg-warn"
                      }`}
                    />
                    <span className="truncate font-semibold">{r.websiteName}</span>
                  </span>
                  <span className="truncate text-muted">{r.clientName}</span>
                  <span className="text-[12.5px] text-faint">
                    {r.lastUsedAt ? timeAgo(r.lastUsedAt) : "never"}
                  </span>
                </Link>
              ))}
            </ScrollTable>
          </div>
        </>
      )}

      <p className="mt-3 text-[12px] text-faint">
        A key that has never been used means the plugin has not called home yet.
        Rotate or revoke one from its website&apos;s settings.
      </p>
    </div>
  );
}
