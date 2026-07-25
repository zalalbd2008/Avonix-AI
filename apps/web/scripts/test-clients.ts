/**
 * Exercises client creation directly: validation, the plan gate, and tenant
 * isolation on write.
 *
 *   npx tsx scripts/test-clients.ts
 */
import { config } from "dotenv";

// dotenv must run before anything that reads process.env at module scope, and
// static imports are hoisted above it. Hence the dynamic imports in main().
config({ path: ".env.local", quiet: true });

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ok   ${name}`);
    pass++;
  } else {
    console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`);
    fail++;
  }
}

async function main() {
  const { eq, sql } = await import("drizzle-orm");
  const { db, withAgency } = await import("../src/lib/db");
  const { agencies, clients, pipelineStages, pipelines } = await import("../src/lib/db/schema");
  const { createClientForAgency } = await import("../src/lib/clients/service");

  const id = crypto.randomUUID();
  const slug = `client-test-${id.slice(0, 8)}`;

  // Bootstrap an agency the same way the app does (see lib/agency/create.ts).
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${id}, true)`);
    await tx.insert(agencies).values({ id, name: "Client Test Agency", slug, plan: "starter" });
  });

  console.log("Validation");
  const short = await createClientForAgency(id, { name: "A" });
  check("rejects a one-character name", !short.ok);

  const badEmail = await createClientForAgency(id, { name: "Valid Name", contactEmail: "not-an-email" });
  check("rejects a malformed email", !badEmail.ok);

  console.log("\nCreation");
  const first = await createClientForAgency(id, { name: "First Client", contactEmail: "a@b.test" });
  check("creates the first client", first.ok, JSON.stringify(first));

  if (first.ok) {
    const [pipeline] = await withAgency(id, (tx) =>
      tx.select({ id: pipelines.id }).from(pipelines).where(eq(pipelines.clientId, first.clientId)),
    );
    check("creates a pipeline alongside the client", Boolean(pipeline));

    const stages = await withAgency(id, (tx) =>
      tx.select({ name: pipelineStages.name }).from(pipelineStages).where(eq(pipelineStages.pipelineId, pipeline.id)),
    );
    check("seeds four default stages", stages.length === 4, `got ${stages.length}`);
  }

  console.log("\nPlan gate");
  const second = await createClientForAgency(id, { name: "Second Client" });
  check("Free plan refuses a second client", !second.ok, second.ok ? "it was allowed" : "");
  check(
    "the refusal explains the limit",
    !second.ok && second.error.includes("Free"),
    !second.ok ? second.error : "",
  );

  // Must go through withAgency: an unscoped update matches no rows under RLS,
  // which is the policy working, not a bug.
  await withAgency(id, (tx) =>
    tx.update(agencies).set({ plan: "professional" }).where(eq(agencies.id, id)),
  );
  const afterUpgrade = await createClientForAgency(id, { name: "Second Client" });
  check("Pro plan allows it", afterUpgrade.ok, JSON.stringify(afterUpgrade));

  console.log("\nIsolation");
  const otherId = crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.agency_id', ${otherId}, true)`);
    await tx.insert(agencies).values({ id: otherId, name: "Other Agency", slug: `other-${otherId.slice(0, 8)}`, plan: "professional" });
  });
  await createClientForAgency(otherId, { name: "Other Agency Client" });

  const visible = await withAgency(id, (tx) => tx.select({ name: clients.name }).from(clients));
  check(
    "the other agency's client is not visible",
    !visible.some((c) => c.name === "Other Agency Client"),
    visible.map((c) => c.name).join(", "),
  );
  check("this agency sees exactly its own two", visible.length === 2, `saw ${visible.length}`);

  await withAgency(id, (tx) => tx.delete(agencies).where(eq(agencies.id, id)));
  await withAgency(otherId, (tx) => tx.delete(agencies).where(eq(agencies.id, otherId)));

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`clients service ok — ${pass} checks passed`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
