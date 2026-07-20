import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { RotateKeyButton } from "@/components/rotate-key-button";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { connectorKeys, websites } from "@/lib/db/schema";

/** Route: /clients/[clientId]/websites/[websiteId] */
export default async function WebsiteOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { websiteId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    if (!site) return null;

    const [key] = await tx
      .select({ prefix: connectorKeys.prefix, createdAt: connectorKeys.createdAt })
      .from(connectorKeys)
      .where(and(eq(connectorKeys.websiteId, websiteId), isNull(connectorKeys.revokedAt)))
      .orderBy(desc(connectorKeys.createdAt))
      .limit(1);

    return { site, key };
  });

  if (!data) notFound();
  const { site, key } = data;
  const connected = site.status === "connected";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <>
      <PageHeader title={site.name} subtitle={site.url} />

      <div
        className={`mb-5 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          connected
            ? "border-[#bfe9e2] bg-[#f0fdf9]"
            : "border-[#ffd9bd] bg-[#fff8f3]"
        }`}
      >
        <span className={`size-2 rounded-full ${connected ? "bg-ok" : "bg-warn"}`} />
        {connected ? (
          <span>
            <b>Connected.</b> Plugin {site.connectorVersion ?? "—"}, last seen{" "}
            {site.lastSeenAt ? new Date(site.lastSeenAt).toLocaleString() : "never"}.
          </span>
        ) : (
          <span>
            <b>Waiting for the plugin.</b> Nothing will arrive until the connector
            is installed and activated on this site.
          </span>
        )}
      </div>

      <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          Install the connector
        </h2>
        <ol className="list-inside list-decimal space-y-2.5 px-4 py-4 text-[13px] text-muted">
          <li>
            Download the Avonix connector plugin and upload it under{" "}
            <b className="text-ink">Plugins → Add New → Upload</b> on {site.url}.
          </li>
          <li>Activate it.</li>
          <li>
            Open <b className="text-ink">Settings → Avonix AI</b> and paste the
            connector key you were shown when this website was added.
          </li>
          <li>
            Set the endpoint to{" "}
            <code className="rounded bg-[#f1f4f8] px-1.5 py-0.5 font-mono text-[12px] text-ink">
              {appUrl}
            </code>
            .
          </li>
          <li>Save. This page will show “Connected” within a few seconds.</li>
        </ol>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          Connector key
        </h2>
        <div className="flex items-center gap-4 px-4 py-4">
          <div>
            <code className="font-mono text-[13px]">{key?.prefix ?? "—"}…</code>
            <p className="mt-1 text-[12px] text-faint">
              {key
                ? `Issued ${new Date(key.createdAt).toLocaleDateString()}. Only a hash is stored, so the full key cannot be shown again.`
                : "No active key."}
            </p>
          </div>
          <div className="ml-auto">
            <RotateKeyButton websiteId={websiteId} />
          </div>
        </div>
      </section>
    </>
  );
}
