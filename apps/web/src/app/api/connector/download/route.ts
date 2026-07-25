import { auth } from "@/lib/auth";
import { buildConnectorZip } from "@/lib/connector/plugin-zip";
import { headers } from "next/headers";

/**
 * GET /api/connector/download
 *
 * Signed-in download of the WordPress connector zip (onboarding + website install).
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Sign in to download the connector.", { status: 401 });
  }

  try {
    const { bytes, filename } = await buildConnectorZip();
    return new Response(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("connector zip failed", e);
    return new Response("Could not build the connector zip.", { status: 500 });
  }
}
