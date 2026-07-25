import { ilike, or, eq } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, websites } from "@/lib/db/schema";

/**
 * GET /api/search?q=
 *
 * Backs the ⌘K palette. Runs through `withAgency`, so it can only ever surface
 * this agency's rows — the search box is not a way around RLS.
 */
export async function GET(request: Request) {
  const ctx = await requireAgency();
  const term = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (term.length < 2) return Response.json([]);

  const like = `%${term}%`;

  const rows = await withAgency(ctx.agencyId, async (tx) => {
    const [matchedClients, matchedContacts, matchedSites] = await Promise.all([
      tx
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(ilike(clients.name, like))
        .limit(5),
      tx
        .select({
          id: contacts.id,
          clientId: contacts.clientId,
          name: contacts.name,
          email: contacts.email,
          clientName: clients.name,
        })
        .from(contacts)
        .innerJoin(clients, eq(clients.id, contacts.clientId))
        .where(or(ilike(contacts.name, like), ilike(contacts.email, like)))
        .limit(5),
      tx
        .select({
          id: websites.id,
          clientId: websites.clientId,
          name: websites.name,
          url: websites.url,
          clientName: clients.name,
        })
        .from(websites)
        .innerJoin(clients, eq(clients.id, websites.clientId))
        .where(or(ilike(websites.name, like), ilike(websites.url, like)))
        .limit(5),
    ]);

    return [
      ...matchedClients.map((c) => ({
        kind: "Client" as const,
        name: c.name,
        sub: "Client workspace",
        href: `/clients/${c.id}`,
      })),
      ...matchedContacts.map((c) => ({
        kind: "Contact" as const,
        name: c.name ?? c.email ?? "Unnamed",
        sub: c.clientName,
        href: `/clients/${c.clientId}/contacts/${c.id}`,
      })),
      ...matchedSites.map((w) => ({
        kind: "Website" as const,
        name: w.name,
        sub: w.clientName,
        href: `/clients/${w.clientId}/websites/${w.id}`,
      })),
    ];
  });

  return Response.json(rows);
}
