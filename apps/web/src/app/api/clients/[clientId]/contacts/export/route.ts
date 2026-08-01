import { desc, eq } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { clients, contacts, websites } from "@/lib/db/schema";

/**
 * GET /api/clients/[clientId]/contacts/export
 *
 * CSV export of contacts for one client (agency-scoped).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [client] = await tx
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    if (!client) return null;

    const rows = await tx
      .select({
        id: contacts.id,
        name: contacts.name,
        email: contacts.email,
        phone: contacts.phone,
        status: contacts.status,
        createdAt: contacts.createdAt,
        source: websites.name,
      })
      .from(contacts)
      .leftJoin(websites, eq(websites.id, contacts.sourceWebsiteId))
      .where(eq(contacts.clientId, clientId))
      .orderBy(desc(contacts.createdAt));

    return { client, rows };
  });

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const header = [
    "name",
    "email",
    "phone",
    "status",
    "source",
    "captured_at",
    "contact_id",
  ];

  const lines = [
    header.join(","),
    ...data.rows.map((r) =>
      [
        csvCell(r.name),
        csvCell(r.email),
        csvCell(r.phone),
        csvCell(r.status),
        csvCell(r.source),
        csvCell(r.createdAt?.toISOString() ?? null),
        csvCell(r.id),
      ].join(","),
    ),
  ];

  const slug = slugify(data.client.name || "contacts");
  const day = new Date().toISOString().slice(0, 10);
  const filename = `${slug}-contacts-${day}.csv`;

  return new Response("\uFEFF" + lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

function csvCell(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "contacts"
  );
}
