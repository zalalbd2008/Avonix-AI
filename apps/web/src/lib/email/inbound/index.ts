import { postmarkInbound } from "./postmark";
import { resendInbound } from "./resend";
import type { InboundEmail } from "./types";

export * from "./types";

/**
 * Try each adapter until one recognises the payload.
 *
 * Sniffing the shape rather than configuring a provider means switching, or
 * running both during a migration, needs no redeploy.
 */
export async function parseInbound(
  body: unknown,
  headers: Headers,
): Promise<{ adapter: string; email: InboundEmail } | null> {
  for (const adapter of [postmarkInbound, resendInbound]) {
    const email = await adapter.parse(body, headers);
    if (email) return { adapter: adapter.name, email };
  }
  return null;
}
