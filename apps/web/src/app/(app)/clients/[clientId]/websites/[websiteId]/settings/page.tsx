import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge } from "@/components/ui/setup-badge";
import { RotateKeyButton } from "@/components/rotate-key-button";
import { WebsiteFontsPanel } from "@/components/websites/website-fonts-panel";
import { WebsiteUrlEditor } from "@/components/websites/website-url-editor";
import { DeleteWebsiteButton } from "@/components/websites/delete-website-button";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { connectorKeys, knowledgeChunks, websites } from "@/lib/db/schema";

/** Route: /clients/[clientId]/websites/[websiteId]/settings */
export default async function WebsiteSettingsPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select()
      .from(websites)
      .where(and(eq(websites.id, websiteId), isNull(websites.deletedAt)))
      .limit(1);
    if (!site) return null;

    const [[key], [chunks], [revoked]] = await Promise.all([
      tx
        .select({ prefix: connectorKeys.prefix, createdAt: connectorKeys.createdAt })
        .from(connectorKeys)
        .where(and(eq(connectorKeys.websiteId, websiteId), isNull(connectorKeys.revokedAt)))
        .orderBy(desc(connectorKeys.createdAt))
        .limit(1),
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(eq(knowledgeChunks.websiteId, websiteId)),
      tx
        .select({ n: count() })
        .from(connectorKeys)
        .where(eq(connectorKeys.websiteId, websiteId)),
    ]);

    return { site, key, chunks: chunks.n, keysIssued: revoked.n };
  });

  if (!data) notFound();
  const { site, key } = data;
  const canDelete =
    ctx.permissions === "*" || ctx.permissions.includes("websites.edit");

  const details: {
    label: string;
    value: string;
    badge?: "connect" | "setup";
  }[] = [
    { label: "Name", value: site.name },
    { label: "URL", value: site.url },
    { label: "Status", value: site.status },
    {
      label: "Plugin version",
      value: site.connectorVersion ?? "not reported",
      badge: !site.connectorVersion ? "connect" : undefined,
    },
    {
      label: "Last seen",
      value: site.lastSeenAt ? new Date(site.lastSeenAt).toLocaleString() : "never",
      badge: !site.lastSeenAt ? "connect" : undefined,
    },
    { label: "Added", value: new Date(site.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Website settings" subtitle={site.url} />

      <WebsiteUrlEditor
        websiteId={websiteId}
        clientId={clientId}
        currentUrl={site.url}
      />

      <WebsiteFontsPanel
        websiteId={websiteId}
        clientId={clientId}
        initial={site.settings?.fonts ?? null}
      />

      <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">Details</h2>
        <dl className="px-4 py-2 text-[13px]">
          {details.map((row) => (
            <div key={row.label} className="flex gap-3 border-b border-[#f6f8fa] py-2.5 last:border-0">
              <dt className="w-32 shrink-0 text-muted">{row.label}</dt>
              <dd className="flex min-w-0 items-center gap-2 break-words capitalize">
                {row.value}
                {row.badge ? <SetupBadge kind={row.badge} /> : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          Connector key
        </h2>
        <div className="flex flex-wrap items-center gap-4 px-4 py-4">
          <div className="min-w-0">
            <code className="inline-flex items-center gap-2 font-mono text-[13px]">
              {key?.prefix ?? "—"}…
              {!key ? <SetupBadge kind="connect" /> : null}
            </code>
            <p className="mt-1 text-[12px] text-faint">
              {key
                ? `Issued ${new Date(key.createdAt).toLocaleDateString()}. ${data.keysIssued} issued in total. Only a hash is stored, so the full key cannot be shown again.`
                : "No active key. Rotate to issue one."}
            </p>
          </div>
          <div className="ml-auto">
            <RotateKeyButton websiteId={websiteId} />
          </div>
        </div>
        <p className="border-t border-[#f1f4f8] px-4 py-2.5 text-[12px] text-faint">
          Rotating revokes the current key immediately. The site stops sending
          until the new one is pasted into the plugin.
        </p>
      </section>

      <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          Indexed content
        </h2>
        <div className="flex items-center gap-4 px-4 py-3.5 text-[13px]">
          <span className="flex items-center gap-2 text-muted">
            {data.chunks === 0
              ? "Nothing indexed. The assistant has no site content to answer from."
              : `${data.chunks} passages from this site.`}
            {data.chunks === 0 ? <SetupBadge kind="setup" /> : null}
          </span>
          <Link
            href={`/clients/${clientId}/websites/${websiteId}/knowledge` as never}
            className="ml-auto shrink-0 text-[13px] font-semibold text-brand hover:underline"
          >
            Manage →
          </Link>
        </div>
      </section>

      {/*
        Renaming is not built yet. URL can be updated above; delete is below.
      */}
      {canDelete ? (
        <section className="overflow-hidden rounded-xl border border-[#fecaca] bg-white">
          <h2 className="border-b border-[#fecaca] px-4 py-3 text-sm font-semibold text-bad">
            Danger zone
          </h2>
          <div className="flex flex-wrap items-center gap-3 px-4 py-4">
            <p className="flex-1 text-[13px] text-muted">
              Soft-delete this website from the dashboard. Type{" "}
              <b className="font-mono text-ink">DELETE</b> to confirm.
            </p>
            <DeleteWebsiteButton
              websiteId={websiteId}
              clientId={clientId}
              websiteName={site.name}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
