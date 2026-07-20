import { count, eq } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { agencies, clients, pipelineStages, pipelines } from "@/lib/db/schema";
import { limitsFor } from "@/lib/plans";

export type CreateClientInput = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
};

export type CreateClientResult =
  | { ok: true; clientId: string }
  | { ok: false; error: string };

/** Stages a new client starts with. A pipeline with no stages is useless. */
const DEFAULT_STAGES = ["New", "Contacted", "Qualified", "Won"];

/**
 * The actual work of creating a client, separated from the server action so it
 * can be exercised directly by scripts/test-clients.ts. A plan limit that is
 * only reachable through a browser form is a plan limit nobody tests.
 *
 * The plan check and the insert share one transaction on purpose: reading the
 * count outside it would let two concurrent submissions both pass a limit of one.
 */
export async function createClientForAgency(
  agencyId: string,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const name = input.name.trim();
  const contactEmail = (input.contactEmail ?? "").trim();
  const contactPhone = (input.contactPhone ?? "").trim();
  const notes = (input.notes ?? "").trim();

  if (name.length < 2) return { ok: false, error: "Give the client a name." };
  if (name.length > 120) return { ok: false, error: "That name is too long." };
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return { ok: false, error: "That email address does not look right." };
  }

  return withAgency(agencyId, async (tx) => {
    const [[agency], [existing]] = await Promise.all([
      tx
        .select({ plan: agencies.plan })
        .from(agencies)
        .where(eq(agencies.id, agencyId))
        .limit(1),
      tx.select({ n: count() }).from(clients),
    ]);

    const limits = limitsFor(agency.plan);
    if (existing.n >= limits.maxClients) {
      return {
        ok: false as const,
        error: `The ${limits.label} plan includes ${limits.maxClients} client. Upgrade to add more.`,
      };
    }

    const [client] = await tx
      .insert(clients)
      .values({
        agencyId,
        name,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        notes: notes || null,
      })
      .returning({ id: clients.id });

    // A client with no pipeline has nowhere to put its first lead, so the
    // pipeline is part of creating the client rather than a later step.
    const [pipeline] = await tx
      .insert(pipelines)
      .values({ agencyId, clientId: client.id, name: "Sales" })
      .returning({ id: pipelines.id });

    await tx.insert(pipelineStages).values(
      DEFAULT_STAGES.map((stageName, position) => ({
        agencyId,
        pipelineId: pipeline.id,
        name: stageName,
        position,
      })),
    );

    return { ok: true as const, clientId: client.id };
  });
}
