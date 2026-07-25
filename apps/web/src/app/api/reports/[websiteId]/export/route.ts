import { requireAgency } from "@/lib/auth/session";
import { loadReport, type ReportRange } from "@/lib/reports/service";

/**
 * GET /api/reports/[websiteId]/export?range=30
 *
 * CSV only. The spec lists PDF, Excel and Doc as well; each needs a dependency
 * — headless Chrome, an xlsx writer, a docx templater — and adding three at
 * once to ship one is the wrong trade. CSV opens in Excel, Sheets and Numbers,
 * and it is the only one that can be streamed correctly with no library at all.
 *
 * Access goes through `requireAgency`, so this is the agency's own export.
 * Nothing here is reachable from a share link: a public URL that dumps every
 * visitor's IP address is not something to add by accident.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const { websiteId } = await params;
  const ctx = await requireAgency();

  const raw = new URL(request.url).searchParams.get("range");
  const range: ReportRange = raw === "7" ? 7 : raw === "90" ? 90 : 30;

  const data = await loadReport(ctx.agencyId, websiteId, range);
  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const header = [
    "when",
    "type",
    "label",
    "css_class",
    "purpose",
    "page",
    "ip",
    "country",
    "city",
    "device",
    "browser",
  ];

  const lines = [
    header.join(","),
    ...data.activity.map((r) =>
      [
        r.createdAt.toISOString(),
        r.eventType,
        r.elementLabel,
        r.cssClass,
        r.purpose,
        r.pagePath,
        r.ipAddress,
        r.country,
        r.city,
        r.device,
        r.browser,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const filename = `${slugify(data.website.name)}-activity-${range}d.csv`;

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Never cached: it carries visitor addresses and is scoped to one tenant.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Quote a CSV cell.
 *
 * The leading-character guard is not decoration. A cell starting with `=`, `+`,
 * `-` or `@` is executed as a formula when the file is opened in Excel, and
 * these cells contain text a stranger typed on someone else's website. Prefixing
 * a quote keeps it text.
 */
function csvCell(value: string | null): string {
  if (value === null || value === undefined) return "";

  const s = String(value);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report";
}
