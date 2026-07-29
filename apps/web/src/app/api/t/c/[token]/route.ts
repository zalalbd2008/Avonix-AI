import { markFollowUpClicked } from "@/lib/automation/followups";

/**
 * GET /api/t/c/[token]?u=<destination>
 * Click tracking redirect for automation emails.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const dest = new URL(request.url).searchParams.get("u")?.trim() || "";
  const safe =
    dest && /^https?:\/\//i.test(dest) && !/^javascript:/i.test(dest)
      ? dest
      : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  try {
    await markFollowUpClicked(token, safe);
  } catch (err) {
    console.error("[track/click]", err);
  }

  return Response.redirect(safe, 302);
}
