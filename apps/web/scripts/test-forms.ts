/**
 * Exercises the forms service: validation, tenant scoping, the embed snippet,
 * and the round trip from a connector submission back to the form's submission
 * list.
 *
 *   npm run dev            # in another terminal
 *   npx tsx scripts/test-forms.ts
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

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
  const { agencies, formSubmissions, forms } = await import("../src/lib/db/schema");
  const { createClientForAgency } = await import("../src/lib/clients/service");
  const { createWebsiteForClient } = await import("../src/lib/websites/service");
  const { createFormForClient } = await import("../src/lib/forms/service");
  const { DEFAULT_FIELDS, embedSnippet, CONTACT_KEYS } = await import("../src/lib/forms/fields");

  async function makeAgency(name: string) {
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.agency_id', ${id}, true)`);
      await tx.insert(agencies).values({
        id,
        name,
        slug: `${name.toLowerCase()}-${randomBytes(4).toString("hex")}`,
        plan: "professional",
      });
    });
    return id;
  }

  const agencyA = await makeAgency("FormsA");
  const agencyB = await makeAgency("FormsB");

  const clientA = await createClientForAgency(agencyA, { name: "Harbour Dental" });
  const clientB = await createClientForAgency(agencyB, { name: "Other Agency Client" });
  if (!clientA.ok || !clientB.ok) throw new Error("client creation failed");

  const otherClientA = await createClientForAgency(agencyA, { name: "Second Client" });

  const siteA = await createWebsiteForClient(agencyA, clientA.clientId, {
    name: "Main",
    url: "https://harbourdental.test",
  });
  if (!siteA.ok) throw new Error(`website creation failed: ${siteA.error}`);
  // Pulled out of the result: TypeScript does not carry the discriminated-union
  // narrowing into the closures below.
  const websiteId = siteA.websiteId;
  const connectorKey = siteA.connectorKey;

  console.log("Validation");
  const short = await createFormForClient(agencyA, {
    clientId: clientA.clientId,
    name: "x",
    fields: DEFAULT_FIELDS,
  });
  check("a one-character name is refused", !short.ok);

  const noFields = await createFormForClient(agencyA, {
    clientId: clientA.clientId,
    name: "Empty",
    fields: [],
  });
  check("a form with no fields is refused", !noFields.ok);

  const badKey = await createFormForClient(agencyA, {
    clientId: clientA.clientId,
    name: "Bad key",
    fields: [{ key: "Full Name", label: "Name", type: "text", required: true }],
  });
  check("a key with spaces and capitals is refused", !badKey.ok, JSON.stringify(badKey));

  const dupe = await createFormForClient(agencyA, {
    clientId: clientA.clientId,
    name: "Duplicate",
    fields: [
      { key: "email", label: "Email", type: "email", required: true },
      { key: "email", label: "Confirm", type: "email", required: true },
    ],
  });
  check("two fields sharing a key are refused", !dupe.ok, JSON.stringify(dupe));

  console.log("\nTenant and client scoping");
  const wrongClient = await createFormForClient(agencyB, {
    clientId: clientA.clientId,
    name: "Cross tenant",
    fields: DEFAULT_FIELDS,
  });
  check(
    "another agency cannot attach a form to this client",
    !wrongClient.ok,
    JSON.stringify(wrongClient),
  );

  const wrongSite =
    otherClientA.ok &&
    (await createFormForClient(agencyA, {
      clientId: otherClientA.clientId,
      name: "Wrong website",
      websiteId,
      fields: DEFAULT_FIELDS,
    }));
  check(
    "a website belonging to a different client of the same agency is refused",
    Boolean(wrongSite) && !(wrongSite as { ok: boolean }).ok,
    JSON.stringify(wrongSite),
  );

  console.log("\nCreation");
  const made = await createFormForClient(agencyA, {
    clientId: clientA.clientId,
    name: "Contact us",
    websiteId,
    fields: [
      ...DEFAULT_FIELDS,
      { key: "budget", label: "Budget", type: "select", required: false, options: ["Low", "High"] },
    ],
    submitLabel: "Request a callback",
  });
  check("a valid form is created", made.ok, JSON.stringify(made));
  if (!made.ok) throw new Error("cannot continue without a form");

  const [stored] = await withAgency(agencyA, (tx) =>
    tx.select().from(forms).where(eq(forms.id, made.formId)).limit(1),
  );
  check("the field list is stored in order", stored.fields[0].key === "name");
  check("the select's options survive the round trip", stored.fields[4].options?.length === 2);
  check("the button label is kept", stored.submitLabel === "Request a callback");
  check("a blank success message falls back to a default", stored.successMessage.length > 0);

  const fromB = await withAgency(agencyB, (tx) =>
    tx.select({ id: forms.id }).from(forms).where(eq(forms.id, made.formId)),
  );
  check("the other agency cannot read the form", fromB.length === 0, `${fromB.length}`);

  console.log("\nEmbed snippet");
  const snippet = embedSnippet(stored);
  check("carries the form id", snippet.includes(`data-form-id="${made.formId}"`));
  check("includes the honeypot", snippet.includes('name="hp"'));
  check("renders a textarea for the message", snippet.includes("<textarea name=\"message\""));
  check("renders the select's options", snippet.includes("<option>Low</option>"));
  check("marks required fields", snippet.includes('name="email"') && snippet.includes("required"));
  check("never contains a connector key", !snippet.includes(connectorKey));

  const escaped = embedSnippet({
    id: "x",
    submitLabel: "Send",
    fields: [{ key: "a", label: '"><script>alert(1)</script>', type: "text", required: false }],
  });
  check(
    "a label with markup in it is escaped",
    !escaped.includes("<script>") && escaped.includes("&lt;script&gt;"),
    escaped,
  );

  console.log("\nSubmission round trip");
  async function submit(body: unknown) {
    const res = await fetch(`${BASE}/api/v1/connector/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${connectorKey}`,
      },
      body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  }

  const sent = await submit({
    form_id: made.formId,
    name: "Rina Ahmed",
    email: "rina@example.test",
    message: "Do you take new patients?",
    fields: { budget: "High" },
    page_url: "https://harbourdental.test/contact",
  });
  check("the submission is accepted", sent.status === 200, JSON.stringify(sent));

  const rows = await withAgency(agencyA, (tx) =>
    tx
      .select({
        values: formSubmissions.values,
        pageUrl: formSubmissions.pageUrl,
        contactId: formSubmissions.contactId,
      })
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, made.formId)),
  );
  check("it is attached to the form", rows.length === 1, `${rows.length}`);
  check("the extra field is kept as data", rows[0]?.values.budget === "High", JSON.stringify(rows[0]?.values));
  check("the page url is recorded", rows[0]?.pageUrl?.includes("/contact") === true);
  check("a contact was created and linked", Boolean(rows[0]?.contactId));
  check(
    "the contact keys really are the ones the endpoint reads",
    ["name", "email", "phone", "message"].every((k) => CONTACT_KEYS.has(k)),
  );

  // A form id from another agency must not attach, even with a valid key for
  // this site — the endpoint checks the form belongs to this client.
  const [formB] = clientB.ok
    ? [
        await createFormForClient(agencyB, {
          clientId: clientB.clientId,
          name: "Theirs",
          fields: DEFAULT_FIELDS,
        }),
      ]
    : [];
  if (formB?.ok) {
    await submit({ form_id: formB.formId, email: "leak@example.test" });
    const leaked = await withAgency(agencyB, (tx) =>
      tx
        .select({ id: formSubmissions.id })
        .from(formSubmissions)
        .where(eq(formSubmissions.formId, formB.formId)),
    );
    check("another agency's form id captures nothing", leaked.length === 0, `${leaked.length}`);
  }

  await withAgency(agencyA, (tx) => tx.delete(agencies).where(eq(agencies.id, agencyA)));
  await withAgency(agencyB, (tx) => tx.delete(agencies).where(eq(agencies.id, agencyB)));

  console.log();
  if (fail > 0) {
    console.log(`FAILED — ${fail} failed, ${pass} passed`);
    process.exit(1);
  }
  console.log(`forms ok — ${pass} checks passed`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
