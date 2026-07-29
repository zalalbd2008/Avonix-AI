import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { StatusPill, timeAgo } from "@/components/ui/status-pill";
import { ScrollTable } from "@/components/ui/scroll-table";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { contacts, websites } from "@/lib/db/schema";

/** Route: /clients/[clientId]/contacts */
export default async function ContactsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const rows = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        phone: contacts.phone,
        status: contacts.status,
        createdAt: contacts.createdAt,
        source: websites.name,
      })
      .from(contacts)
      .leftJoin(websites, eq(websites.id, contacts.sourceWebsiteId))
      .where(eq(contacts.clientId, clientId))
      .orderBy(desc(contacts.createdAt))
      .limit(200),
  );

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle={`${rows.length} ${rows.length === 1 ? "person" : "people"} captured for this client`}
      />

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No contacts yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">
            They arrive automatically when someone fills in a form on a connected
            website.
          </p>
          <Link
            href={`/clients/${clientId}/websites` as never}
            className="mt-4 inline-block text-[13px] font-semibold text-brand hover:underline"
          >
            Check the websites →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${clientId}/contacts/${c.id}` as never}
                className="rounded-xl border border-line bg-white p-4 hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold">
                      {c.name ?? "Unnamed"}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-muted">
                      {c.email ?? c.phone ?? "—"}
                    </p>
                  </div>
                  <StatusPill value={c.status} />
                </div>
                <p className="mt-2 text-[12px] text-faint">
                  {c.source ?? "—"} · {timeAgo(c.createdAt)}
                </p>
              </Link>
            ))}
          </div>

          <div className="hidden md:block">
            <ScrollTable minWidth={720}>
              <div className="grid grid-cols-[1.4fr_1.4fr_.8fr_.8fr_.7fr] border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold tracking-[0.07em] text-faint uppercase">
                <span>Name</span>
                <span>Email</span>
                <span>Source</span>
                <span>Captured</span>
                <span>Status</span>
              </div>
              {rows.map((c) => (
                <Link
                  key={c.id}
                  href={`/clients/${clientId}/contacts/${c.id}` as never}
                  className="grid grid-cols-[1.4fr_1.4fr_.8fr_.8fr_.7fr] items-center border-b border-[#f1f4f8] px-4 py-3 text-[13px] last:border-0 hover:bg-[#f8fafc]"
                >
                  <span className="font-semibold">{c.name ?? "Unnamed"}</span>
                  <span className="truncate text-muted">
                    {c.email ?? c.phone ?? "—"}
                  </span>
                  <span className="text-[12.5px] text-faint">
                    {c.source ?? "—"}
                  </span>
                  <span className="text-[12.5px] text-faint">
                    {timeAgo(c.createdAt)}
                  </span>
                  <span>
                    <StatusPill value={c.status} />
                  </span>
                </Link>
              ))}
            </ScrollTable>
          </div>
        </>
      )}
    </>
  );
}
