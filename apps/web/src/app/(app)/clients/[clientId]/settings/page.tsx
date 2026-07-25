import { notFound } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, forms, websites } from "@/lib/db/schema";

/** Route: /clients/[clientId]/settings */
export default async function ClientSettingsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [client] = await tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
      .limit(1);
    if (!client) return null;

    const [[siteCount], [contactCount], [formCount]] = await Promise.all([
      tx
        .select({ n: count() })
        .from(websites)
        .where(
          and(eq(websites.clientId, clientId), isNull(websites.deletedAt)),
        ),
      tx
        .select({ n: count() })
        .from(contacts)
        .where(eq(contacts.clientId, clientId)),
      tx
        .select({ n: count() })
        .from(forms)
        .where(eq(forms.clientId, clientId)),
    ]);

    return {
      client,
      siteCount: siteCount.n,
      contactCount: contactCount.n,
      formCount: formCount.n,
    };
  });

  if (!data) notFound();
  const { client } = data;

  const details: [string, string][] = [
    ["Name", client.name],
    ["Contact email", client.contactEmail ?? "—"],
    ["Contact phone", client.contactPhone ?? "—"],
    ["Added", new Date(client.createdAt).toLocaleDateString()],
  ];

  const attached: [string, number][] = [
    ["Websites", data.siteCount],
    ["Contacts", data.contactCount],
    ["Forms", data.formCount],
  ];

  const canDelete =
    ctx.permissions === "*" || ctx.permissions.includes("clients.edit");

  return (
    <div className="max-w-2xl">
      <PageHeader title="Client settings" subtitle={client.name} />

      <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          Details
        </h2>
        <dl className="px-4 py-2 text-[13px]">
          {details.map(([k, v]) => (
            <div
              key={k}
              className="flex gap-3 border-b border-[#f6f8fa] py-2.5 last:border-0"
            >
              <dt className="w-32 shrink-0 text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {client.notes ? (
        <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
          <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
            Notes
          </h2>
          <p className="px-4 py-3.5 text-[13px] leading-[1.65] whitespace-pre-wrap text-muted">
            {client.notes}
          </p>
        </section>
      ) : null}

      <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
        <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
          What is attached
        </h2>
        <dl className="px-4 py-2 text-[13px]">
          {attached.map(([k, v]) => (
            <div
              key={k}
              className="flex gap-3 border-b border-[#f6f8fa] py-2.5 last:border-0"
            >
              <dt className="w-32 shrink-0 text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {canDelete ? (
        <section className="overflow-hidden rounded-xl border border-[#fecaca] bg-white">
          <h2 className="border-b border-[#fecaca] px-4 py-3 text-sm font-semibold text-bad">
            Danger zone
          </h2>
          <div className="flex flex-wrap items-center gap-3 px-4 py-4">
            <p className="flex-1 text-[13px] text-muted">
              Soft-delete this client and its websites. Type{" "}
              <b className="font-mono text-ink">DELETE</b> to confirm.
            </p>
            <DeleteClientButton
              clientId={clientId}
              clientName={client.name}
              websiteCount={data.siteCount}
              contactCount={data.contactCount}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
