import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

/**
 * Dev-only: latest console-transport message for an address.
 * Real mail requires RESEND_API_KEY + EMAIL_FROM.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available." }, { status: 404 });
  }

  const to = new URL(req.url).searchParams.get("to")?.trim().toLowerCase() ?? "";
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Missing to=" }, { status: 400 });
  }

  const dir = join(process.cwd(), ".mail");
  let files: string[] = [];
  try {
    files = (await readdir(dir))
      .filter((f) => f.endsWith(".html"))
      .sort()
      .reverse();
  } catch {
    return NextResponse.json({
      provider: "console",
      found: false,
      hint: "No .mail/ folder yet — sign up or resend first.",
    });
  }

  const safe = to.replace(/[^a-z0-9@._-]/gi, "_");
  const match = files.find((f) => f.includes(`__${safe}.html`));
  if (!match) {
    return NextResponse.json({
      provider: "console",
      found: false,
      hint: `No saved message for ${to}. If this address is already verified, no new mail is sent.`,
    });
  }

  const html = await readFile(join(dir, match), "utf8");
  const link =
    html.match(/https?:\/\/[^\s"'<>]+verify-email[^\s"'<>]*/)?.[0] ??
    html.match(/https?:\/\/[^\s"'<>]+/)?.[0] ??
    null;

  return NextResponse.json({
    provider: "console",
    found: true,
    file: match,
    link,
  });
}
