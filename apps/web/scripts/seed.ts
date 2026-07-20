/**
 * Development seed.
 *
 * Creates TWO agencies on purpose. A single-tenant seed hides the bug class this
 * product cannot afford — every screen you build should be checked against a
 * database where another agency's data exists and must never appear.
 *
 *   npx tsx scripts/seed.ts
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const url = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("ADMIN_DATABASE_URL or DATABASE_URL must be set");

const sql = postgres(url, { max: 1 });

async function main() {
  await sql`DELETE FROM agencies WHERE slug IN ('northwind', 'bluewave')`;

  const [northwind] = await sql`
    INSERT INTO agencies (name, slug, plan, status)
    VALUES ('Northwind Digital', 'northwind', 'pro', 'active')
    RETURNING id`;

  const [bluewave] = await sql`
    INSERT INTO agencies (name, slug, plan, status)
    VALUES ('Bluewave Studio', 'bluewave', 'free', 'trialing')
    RETURNING id`;

  // Northwind: three clients, one with two sites — exercises the "one CRM per
  // client, many sites" rule from ADR-002 §4.
  const clients = await sql`
    INSERT INTO clients (agency_id, name, contact_email) VALUES
      (${northwind.id}, 'Harbour Dental',   'hello@harbourdental.test'),
      (${northwind.id}, 'Meridian Law',     'contact@meridianlaw.test'),
      (${northwind.id}, 'Cedar Landscaping','info@cedarland.test')
    RETURNING id, name`;

  const harbour = clients.find((c) => c.name === "Harbour Dental")!;
  const meridian = clients.find((c) => c.name === "Meridian Law")!;

  await sql`
    INSERT INTO websites (agency_id, client_id, name, url, status, connector_secret) VALUES
      (${northwind.id}, ${harbour.id},  'Main site',   'https://harbourdental.test',      'connected',  ${crypto.randomUUID()}),
      (${northwind.id}, ${harbour.id},  'Booking site','https://book.harbourdental.test', 'connected',  ${crypto.randomUUID()}),
      (${northwind.id}, ${meridian.id}, 'Main site',   'https://meridianlaw.test',        'pending',    ${crypto.randomUUID()})`;

  const contacts = await sql`
    INSERT INTO contacts (agency_id, client_id, name, email, status) VALUES
      (${northwind.id}, ${harbour.id},  'Ayesha Rahman', 'ayesha@example.test',  'new'),
      (${northwind.id}, ${harbour.id},  'Tom Whitfield', 'tom@example.test',     'working'),
      (${northwind.id}, ${meridian.id}, 'Priya Nair',    'priya@example.test',   'qualified')
    RETURNING id, name`;

  const [pipeline] = await sql`
    INSERT INTO pipelines (agency_id, client_id, name)
    VALUES (${northwind.id}, ${harbour.id}, 'Sales')
    RETURNING id`;

  const stages = await sql`
    INSERT INTO pipeline_stages (agency_id, pipeline_id, name, position) VALUES
      (${northwind.id}, ${pipeline.id}, 'New',       0),
      (${northwind.id}, ${pipeline.id}, 'Contacted', 1),
      (${northwind.id}, ${pipeline.id}, 'Booked',    2),
      (${northwind.id}, ${pipeline.id}, 'Won',       3)
    RETURNING id, name`;

  await sql`
    INSERT INTO pipeline_cards (agency_id, pipeline_id, stage_id, contact_id, position)
    VALUES (${northwind.id}, ${pipeline.id}, ${stages[0].id}, ${contacts[0].id}, 0)`;

  // Bluewave exists only so that every query you write has something to wrongly
  // return. Its data must never appear on a Northwind screen.
  const [rival] = await sql`
    INSERT INTO clients (agency_id, name) VALUES (${bluewave.id}, 'Rival Client — MUST NOT BE VISIBLE')
    RETURNING id`;
  await sql`
    INSERT INTO contacts (agency_id, client_id, name, email, status)
    VALUES (${bluewave.id}, ${rival.id}, 'Leaked Person — MUST NOT BE VISIBLE', 'leak@example.test', 'new')`;

  console.log("seeded:");
  console.log(`  Northwind Digital  ${northwind.id}  3 clients, 3 websites, 3 contacts`);
  console.log(`  Bluewave Studio    ${bluewave.id}  1 client, 1 contact (isolation canary)`);
}

main()
  .then(() => sql.end())
  .catch(async (e) => {
    console.error(e);
    await sql.end();
    process.exit(1);
  });
