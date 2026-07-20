import { PageHeader } from "@/components/shell/page-header";
import { PipelineBoard } from "@/components/pipeline-board";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { contacts, pipelineCards } from "@/lib/db/schema";
import { loadPipeline } from "@/lib/crm/service";
import { and, eq, notInArray } from "drizzle-orm";

/** Route: /clients/[clientId]/pipeline */
export default async function PipelinePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const board = await loadPipeline(ctx.agencyId, clientId);

  if (!board) {
    return (
      <>
        <PageHeader title="Pipeline" subtitle="No pipeline for this client" />
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center text-[13px] text-muted">
          This client has no pipeline. Clients created from now on get one
          automatically.
        </div>
      </>
    );
  }

  // Contacts that exist but are not on the board yet — otherwise a lead captured
  // by the connector is invisible here and looks lost.
  const onBoard = board.stages.flatMap((s) => s.cards.map((c) => c.contactId));
  const unplaced = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({ id: contacts.id, name: contacts.name, email: contacts.email, status: contacts.status })
      .from(contacts)
      .where(
        onBoard.length
          ? and(eq(contacts.clientId, clientId), notInArray(contacts.id, onBoard))
          : eq(contacts.clientId, clientId),
      )
      .limit(50),
  );

  const total = board.stages.reduce((n, s) => n + s.cards.length, 0);

  return (
    <>
      <PageHeader
        title={board.pipeline.name}
        subtitle={`${total} on the board · ${unplaced.length} not yet placed`}
      />
      <PipelineBoard
        clientId={clientId}
        stages={board.stages}
        unplaced={unplaced}
      />
    </>
  );
}
