import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { LiquidFormBuilder } from "@/components/forms/liquid-form-builder";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/forms/new
 *
 * Liquid responsive form builder scoped to this website.
 */
export default async function NewWebsiteFormPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const [site] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ id: websites.id, name: websites.name })
      .from(websites)
      .where(and(eq(websites.id, websiteId), eq(websites.clientId, clientId)))
      .limit(1),
  );

  if (!site) notFound();

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-bold tracking-[-0.02em]">Ultimate form builder</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Multi-step · conditional logic · dynamic fields — for {site.name}
        </p>
      </header>

      <LiquidFormBuilder
        clientId={clientId}
        websiteId={websiteId}
        websiteName={site.name}
        memberRole={ctx.role}
      />
    </div>
  );
}
