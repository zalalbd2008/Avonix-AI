import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { crmModules } from "@/lib/crm/modules";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

export default async function WebsiteCrmHomePage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();
  const [site] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ name: websites.name })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.clientId, clientId)))
      .limit(1),
  );
  if (!site) notFound();

  const modules = crmModules(clientId, websiteId);

  return (
    <div>
      <PageHeader
        title="CRM"
        subtitle={`${site.name} — step-by-step`}
      />
      <p className="mb-5 max-w-xl text-[13.5px] leading-relaxed text-muted">
        This CRM is tied to this website. Click a card — no heavy load.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={m.href as never}
            prefetch
            className={`rounded-xl border-2 bg-gradient-to-br ${m.bar} to-white p-4 transition hover:brightness-[0.98] ${m.tone}`}
          >
            <span className="text-[10px] font-bold tracking-wide uppercase opacity-70">
              Step {m.step}
            </span>
            <h2 className="mt-1 text-[15px] font-bold text-ink">{m.label}</h2>
            <p className="mt-0.5 text-[12px] opacity-80">{m.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
