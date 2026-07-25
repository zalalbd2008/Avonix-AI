import { requireAgency } from "@/lib/auth/session";
import { buildOrgLibraryPackage } from "@/lib/forms/library-transfer";
import { zipLibraryPackage } from "@/lib/forms/library-zip";

/**
 * GET /api/templates/export
 *
 * Downloads the organization cloud library as an Avonix ZIP package
 * (templates + components + sections + assets). Optional query:
 *   ?ids=uuid,uuid  — export only those template ids
 *   ?format=json    — single JSON file instead of ZIP
 */
export async function GET(request: Request) {
  const ctx = await requireAgency();
  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const idsRaw = url.searchParams.get("ids");
  const templateIds = idsRaw
    ? idsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 100)
    : undefined;

  const pkg = await buildOrgLibraryPackage(
    ctx.agencyId,
    ctx.userId,
    ctx.agencyName,
    templateIds?.length ? { templateIds } : { all: true },
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const base = `avonix-library-${stamp}`;

  if (format === "json") {
    return new Response(JSON.stringify(pkg, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.json"`,
      },
    });
  }

  const zip = zipLibraryPackage(pkg);
  return new Response(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${base}.zip"`,
      "Content-Length": String(zip.byteLength),
    },
  });
}
