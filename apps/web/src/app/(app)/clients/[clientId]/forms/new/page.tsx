import { asc, eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { FormBuilder } from "./form-builder";

/** Route: /clients/[clientId]/forms/new */
export default async function NewFormPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const sites = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ id: websites.id, name: websites.name })
      .from(websites)
      .where(eq(websites.clientId, clientId))
      .orderBy(asc(websites.name)),
  );

  return (
    <>
      <PageHeader
        title="New form"
        subtitle="A field list, not a canvas — see BACKLOG §4 for why"
      />
      <FormBuilder clientId={clientId} websites={sites} />
    </>
  );
}
