import { consoleProvider } from "./providers/console";
import { resendProvider } from "./providers/resend";
import { smtpProvider } from "./providers/smtp";
import type { Email, EmailProvider } from "./types";

export type { Email, EmailProvider };

/**
 * Transport selection (first match wins):
 * 1. SMTP_* + EMAIL_FROM  → nodemailer (Gmail App Password, Hostinger, etc.)
 * 2. RESEND_API_KEY + EMAIL_FROM → Resend API
 * 3. Dev → `.mail/` console transport
 * 4. Production with neither → throws on send
 */
function unconfiguredProductionProvider(): EmailProvider {
  return {
    name: "unconfigured",
    async send() {
      throw new Error(
        "Outbound email is not configured. Set SMTP_HOST/SMTP_USER/SMTP_PASS + EMAIL_FROM, or RESEND_API_KEY + EMAIL_FROM, then restart the app.",
      );
    },
  };
}

function selectProvider(): EmailProvider {
  const from = process.env.EMAIL_FROM?.trim();
  const isProd = process.env.NODE_ENV === "production";

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpHost && smtpUser && smtpPass && from) {
    const port = Number(process.env.SMTP_PORT || "587");
    const secure =
      process.env.SMTP_SECURE === "true" ||
      process.env.SMTP_SECURE === "1" ||
      port === 465;
    return smtpProvider({
      host: smtpHost,
      port: Number.isFinite(port) ? port : 587,
      secure,
      user: smtpUser,
      pass: smtpPass,
      from,
    });
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey && from) return resendProvider(resendKey, from);

  if (resendKey && !from) {
    console.warn(
      "[email] RESEND_API_KEY is set but EMAIL_FROM is not — cannot send.",
    );
  }
  if (smtpHost && !from) {
    console.warn("[email] SMTP_HOST is set but EMAIL_FROM is not — cannot send.");
  }

  if (isProd) {
    console.error(
      "[email] Production mail disabled: configure SMTP_* or RESEND_API_KEY with EMAIL_FROM.",
    );
    return unconfiguredProductionProvider();
  }

  return consoleProvider;
}

let provider: EmailProvider | null = null;

export async function sendEmail(email: Email) {
  provider ??= selectProvider();
  try {
    return await provider.send(email);
  } catch (err) {
    // Invalid/expired RESEND_API_KEY still selects Resend over the local
    // `.mail/` transport. In development, fall back so invites and auth
    // flows stay usable without a working live key.
    const isProd = process.env.NODE_ENV === "production";
    if (!isProd && provider.name !== "console") {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[email] ${provider.name} failed (${message.slice(0, 120)}) — falling back to .mail/ console transport.`,
      );
      provider = consoleProvider;
      return consoleProvider.send(email);
    }
    throw err;
  }
}

export function emailProviderName() {
  provider ??= selectProvider();
  return provider.name;
}

/** True when Resend or SMTP is wired for live delivery. */
export function isLiveEmailConfigured() {
  const from = Boolean(process.env.EMAIL_FROM?.trim());
  const smtp = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  return from && (smtp || resend);
}



