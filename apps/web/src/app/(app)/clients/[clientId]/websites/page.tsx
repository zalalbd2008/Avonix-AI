import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/** Route: /clients/[clientId]/websites */
export default async function ClientWebsitesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: websites.id,
        name: websites.name,
        url: websites.url,
        status: websites.status,
        lastSeenAt: websites.lastSeenAt,
        version: websites.connectorVersion,
      })
      .from(websites)
      .where(
        and(eq(websites.clientId, clientId), isNull(websites.deletedAt)),
      )
      .orderBy(desc(websites.createdAt)),
  );

  const tone: Record<string, string> = {
    connected: "text-ok",
    pending: "text-warn",
    disconnected: "text-bad",
  };

  return (
    <>
      <PageHeader
        title="Websites"
        subtitle="Each connected site sends this client's leads into one inbox"
        action={
          <Link
            href={`/clients/${clientId}/websites/new` as never}
            className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + Add website
          </Link>
        }
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No websites yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            Add the client&apos;s WordPress site and install the connector plugin.
            Until then no leads can arrive.
          </p>
          <Link
            href={`/clients/${clientId}/websites/new` as never}
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
          >
            + Add website
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {rows.map((w) => (
            <Link
              key={w.id}
              href={`/clients/${clientId}/websites/${w.id}` as never}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#f8fafc]"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold">{w.name}</div>
                <div className="truncate text-[12px] text-faint">{w.url}</div>
              </div>
              <div className="ml-auto flex items-center gap-4 text-[12px]">
                {w.version && <span className="text-faint">plugin {w.version}</span>}
                <span className="text-faint">
                  {w.lastSeenAt ? `seen ${timeAgo(w.lastSeenAt)}` : "never seen"}
                </span>
                <span className={`flex items-center gap-1.5 font-semibold ${tone[w.status]}`}>
                  <span className="size-1.5 rounded-full bg-current" />
                  {w.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
