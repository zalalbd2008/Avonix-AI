/**
 * Shared signup / form policy for disposable and invalid emails.
 */

const DISPOSABLE_DOMAINS = new Set(
  [
    "mailinator.com",
    "guerrillamail.com",
    "guerrillamail.de",
    "guerrillamail.net",
    "guerrillamail.org",
    "guerrillamailblock.com",
    "10minutemail.com",
    "10minutemail.net",
    "tempmail.com",
    "temp-mail.org",
    "temp-mail.io",
    "tempmailo.com",
    "tmpmail.org",
    "tmpmail.net",
    "yopmail.com",
    "yopmail.fr",
    "trashmail.com",
    "trashmail.me",
    "sharklasers.com",
    "guerrillamail.info",
    "grr.la",
    "getnada.com",
    "nada.email",
    "discard.email",
    "discardmail.com",
    "maildrop.cc",
    "mailnesia.com",
    "mailcatch.com",
    "mailnull.com",
    "spamgourmet.com",
    "throwaway.email",
    "throwawaymail.com",
    "fakeinbox.com",
    "fakemailgenerator.com",
    "emailondeck.com",
    "getairmail.com",
    "mintemail.com",
    "mohmal.com",
    "inboxkitten.com",
    "tempail.com",
    "tempr.email",
    "dispostable.com",
    "mailforspam.com",
    "spam4.me",
    "mytemp.email",
    "emailtemporanea.com",
    "temporary-mail.net",
    "tmpeml.com",
    "burnermail.io",
    "mailpoof.com",
    "mailinator.net",
    "mailinator.org",
    "maildax.com",
    "tempinbox.com",
    "33mail.com",
    // catch-all style temp providers often used in spam tests
    "mailto.plus",
    "fexpost.com",
    "fexbox.org",
    "mailbox.in.ua",
    "chitthi.in",
    "rover.info",
    "spymail.one",
    "lasttea.com",
  ].map((d) => d.toLowerCase()),
);

/** Exported for form security + auth hooks. */
export function isDisposableEmailDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  if (!d) return false;
  if (DISPOSABLE_DOMAINS.has(d)) return true;
  // Block common multi-level temp hosts: foo.mailinator.com
  for (const blocked of DISPOSABLE_DOMAINS) {
    if (d.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export type EmailPolicyResult =
  | { ok: true; email: string; domain: string }
  | { ok: false; error: string };

/**
 * Validate an address for Avonix account signup.
 * Requires a real-looking mailbox — rejects empty, malformed, and throwaway domains.
 */
export function validateSignupEmail(raw: string): EmailPolicyResult {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Enter your email address." };

  // Practical RFC-lite check (not full RFC 5322).
  if (email.length > 254 || email.includes(" ")) {
    return { ok: false, error: "That email address is not valid." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: "That email address is not valid." };
  }

  const domain = email.split("@")[1] ?? "";
  if (!domain || domain.startsWith(".") || domain.endsWith(".")) {
    return { ok: false, error: "That email address is not valid." };
  }
  if (isDisposableEmailDomain(domain)) {
    return {
      ok: false,
      error:
        "Temporary or disposable email addresses are not allowed. Use a permanent work or personal email.",
    };
  }

  return { ok: true, email, domain };
}

export { DISPOSABLE_DOMAINS };
