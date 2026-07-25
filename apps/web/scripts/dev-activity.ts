/**
 * Fills the seeded agency with a form and some inbound activity.
 *
 * Everything here goes through the real paths — the form service and the
 * connector's submit endpoint — so what you see on screen is what a live site
 * would actually produce. Inserting rows directly would happily create states
 * the product can never reach.
 *
 *   npx tsx scripts/dev-activity.ts <connector-key>
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const key = process.argv[2];
if (!key) throw new Error("usage: tsx scripts/dev-activity.ts <connector-key>");

const url = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("ADMIN_DATABASE_URL or DATABASE_URL must be set");
const sql = postgres(url, { max: 1 });

const VISITORS = [
  { name: "Rina Ahmed", email: "rina@example.test", message: "Do you take new patients on Saturdays?" },
  { name: "Tomasz Nowak", email: "tomasz@example.test", message: "How much is a check-up and clean?" },
  { name: "Priya Raman", email: "priya@example.test", message: "Is there parking near the practice?" },
];

async function main() {
  const [agency] = await sql`SELECT id FROM agencies WHERE slug = 'northwind' LIMIT 1`;
  if (!agency) throw new Error("Seed first: npx tsx scripts/seed.ts");

  const [client] = await sql`
    SELECT id FROM clients WHERE agency_id = ${agency.id} AND name = 'Harbour Dental' LIMIT 1`;
  const [site] = await sql`
    SELECT id FROM websites WHERE client_id = ${client.id} ORDER BY created_at LIMIT 1`;

  const { createFormForClient } = await import("../src/lib/forms/service");
  const { DEFAULT_FIELDS } = await import("../src/lib/forms/fields");

  const existing = await sql`SELECT id FROM forms WHERE client_id = ${client.id} LIMIT 1`;
  let formId: string;

  if (existing.length > 0) {
    formId = existing[0].id;
    console.log("form already exists");
  } else {
    const made = await createFormForClient(agency.id, {
      clientId: client.id,
      name: "Contact us",
      websiteId: site.id,
      fields: [
        ...DEFAULT_FIELDS,
        { key: "reason", label: "Reason for visit", type: "select", required: false, options: ["Check-up", "Pain", "Cosmetic"] },
      ],
      submitLabel: "Request a callback",
    });
    if (!made.ok) throw new Error(made.error);
    formId = made.formId;
    console.log("form created");
  }

  let sent = 0;
  for (const v of VISITORS) {
    const res = await fetch(`${BASE}/api/v1/connector/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        form_id: formId,
        name: v.name,
        email: v.email,
        message: v.message,
        fields: { reason: "Check-up" },
        page_url: "https://harbourdental.test/contact",
      }),
    });
    if (res.ok) sent++;
    else console.error(`submit failed: ${res.status} ${await res.text()}`);
  }

  console.log(`${sent}/${VISITORS.length} submissions accepted`);
  console.log(`form: ${formId}`);

  // Tracked activity, through the same endpoint the plugin uses.
  const PAGES = ["/", "/", "/", "/pricing", "/pricing", "/contact", "/blog/whitening"];
  const CLICKS = [
    { type: "button", css_class: "avx-track-book", label: "Book appointment", purpose: "Appointment booking" },
    { type: "consultation", css_class: "avx-consult-call", label: "Call now", purpose: "Start a phone call" },
    { type: "button", css_class: "avx-track-map", label: "Get directions", purpose: "Open the map" },
    { type: "form", css_class: "avx-form-contact", label: "Contact form", purpose: "New patient enquiry" },
  ];

  const events = [
    ...PAGES.map((page_path) => ({ type: "pageview", page_path })),
    ...CLICKS.map((c, i) => ({ ...c, page_path: PAGES[i % PAGES.length] })),
  ];

  const tracked = await fetch(`${BASE}/api/v1/connector/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "User-Agent": "Mozilla/5.0 (Macintosh) Chrome/120 Safari/537.36",
    },
    body: JSON.stringify({ events }),
  });
  console.log(
    tracked.ok
      ? `${events.length} tracked events accepted`
      : `tracking failed: ${tracked.status} ${await tracked.text()}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
