import { consoleProvider } from "./providers/console";
import { resendProvider } from "./providers/resend";
import type { Email, EmailProvider } from "./types";

export type { Email, EmailProvider };

/**
 * Picks a transport from the environment.
 *
 * With RESEND_API_KEY set, mail is really sent. Without it, mail is written to
 * `.mail/` and logged. There is deliberately no third state where sending
 * appears to work and does not.
 */
function selectProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (key && from) return resendProvider(key, from);

  if (key && !from) {
    console.warn(
      "[email] RESEND_API_KEY is set but EMAIL_FROM is not — falling back to the dev transport.",
    );
  }
  return consoleProvider;
}

let provider: EmailProvider | null = null;

export async function sendEmail(email: Email) {
  provider ??= selectProvider();
  return provider.send(email);
}

export function emailProviderName() {
  provider ??= selectProvider();
  return provider.name;
}
