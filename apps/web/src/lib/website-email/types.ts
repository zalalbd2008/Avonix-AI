/**
 * Per-website outbound email (SMTP) + campaign identity.
 * Stored on `websites.settings.email` (JSON).
 *
 * Auth modes:
 * - password: classic SMTP user/pass
 * - google / microsoft: OAuth2 (XOAUTH2) after "Verify with …"
 */

export type SmtpEncryption = "none" | "tls" | "ssl";

export type SmtpAuthMode = "password" | "google" | "microsoft";

export type WebsiteEmailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  /** SMTP password — stored in website settings JSON. */
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  /** Where alert digests (uptime, updates) are delivered. */
  notifyEmail: string;
  /** Campaign composer ships later; identity can be set now. */
  campaignsEnabled: boolean;
  campaignFromName: string;
  campaignReplyTo: string;

  /** How SMTP authenticates. */
  authMode: SmtpAuthMode;
  /** OAuth app credentials (per website). */
  oauthClientId: string;
  oauthClientSecret: string;
  /** Set after successful Verify with Google / Microsoft. */
  oauthRefreshToken: string;
  oauthAccessToken: string;
  oauthTokenExpiresAt: string;
  oauthVerifiedEmail: string;
  oauthVerifiedAt: string;
  oauthProvider: "" | "google" | "microsoft";
};

export const SMTP_ENCRYPTION: { id: SmtpEncryption; label: string }[] = [
  { id: "tls", label: "STARTTLS" },
  { id: "ssl", label: "SSL / TLS" },
  { id: "none", label: "None" },
];

export const SMTP_AUTH_MODES: {
  id: SmtpAuthMode;
  label: string;
  hint: string;
}[] = [
  {
    id: "password",
    label: "Username + password",
    hint: "Classic SMTP login / App Password",
  },
  {
    id: "google",
    label: "Google OAuth",
    hint: "Verify with Google → Gmail / Workspace SMTP",
  },
  {
    id: "microsoft",
    label: "Microsoft OAuth",
    hint: "Verify with Microsoft → Outlook / M365 SMTP",
  },
];

export const DEFAULT_WEBSITE_EMAIL: WebsiteEmailSettings = {
  enabled: false,
  host: "",
  port: 587,
  encryption: "tls",
  username: "",
  password: "",
  fromName: "",
  fromEmail: "",
  replyTo: "",
  notifyEmail: "",
  campaignsEnabled: false,
  campaignFromName: "",
  campaignReplyTo: "",
  authMode: "password",
  oauthClientId: "",
  oauthClientSecret: "",
  oauthRefreshToken: "",
  oauthAccessToken: "",
  oauthTokenExpiresAt: "",
  oauthVerifiedEmail: "",
  oauthVerifiedAt: "",
  oauthProvider: "",
};

/** Sensible SMTP defaults when picking an OAuth provider. */
export function smtpDefaultsForAuthMode(
  mode: SmtpAuthMode,
): Partial<WebsiteEmailSettings> {
  if (mode === "google") {
    return {
      authMode: "google",
      host: "smtp.gmail.com",
      port: 587,
      encryption: "tls",
    };
  }
  if (mode === "microsoft") {
    return {
      authMode: "microsoft",
      host: "smtp.office365.com",
      port: 587,
      encryption: "tls",
    };
  }
  return { authMode: "password" };
}

function clampInt(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function str(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function normalizeEncryption(raw: unknown): SmtpEncryption {
  if (raw === "none" || raw === "tls" || raw === "ssl") return raw;
  return DEFAULT_WEBSITE_EMAIL.encryption;
}

function normalizeAuthMode(raw: unknown): SmtpAuthMode {
  if (raw === "google" || raw === "microsoft" || raw === "password") return raw;
  return "password";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  if (!value) return false;
  return EMAIL_RE.test(value);
}

export function mergeWebsiteEmailSettings(
  raw?: Partial<WebsiteEmailSettings> | null,
): WebsiteEmailSettings {
  if (!raw) return structuredClone(DEFAULT_WEBSITE_EMAIL);
  const provider = str(raw.oauthProvider);
  return {
    enabled: Boolean(raw.enabled),
    host: str(raw.host),
    port: clampInt(Number(raw.port), 1, 65535, DEFAULT_WEBSITE_EMAIL.port),
    encryption: normalizeEncryption(raw.encryption),
    username: str(raw.username),
    password: typeof raw.password === "string" ? raw.password : "",
    fromName: str(raw.fromName),
    fromEmail: str(raw.fromEmail).toLowerCase(),
    replyTo: str(raw.replyTo).toLowerCase(),
    notifyEmail: str(raw.notifyEmail).toLowerCase(),
    campaignsEnabled: Boolean(raw.campaignsEnabled),
    campaignFromName: str(raw.campaignFromName),
    campaignReplyTo: str(raw.campaignReplyTo).toLowerCase(),
    authMode: normalizeAuthMode(raw.authMode),
    oauthClientId: str(raw.oauthClientId),
    oauthClientSecret:
      typeof raw.oauthClientSecret === "string" ? raw.oauthClientSecret : "",
    oauthRefreshToken:
      typeof raw.oauthRefreshToken === "string" ? raw.oauthRefreshToken : "",
    oauthAccessToken:
      typeof raw.oauthAccessToken === "string" ? raw.oauthAccessToken : "",
    oauthTokenExpiresAt: str(raw.oauthTokenExpiresAt),
    oauthVerifiedEmail: str(raw.oauthVerifiedEmail).toLowerCase(),
    oauthVerifiedAt: str(raw.oauthVerifiedAt),
    oauthProvider:
      provider === "google" || provider === "microsoft" ? provider : "",
  };
}

export function isSmtpOauthVerified(settings: WebsiteEmailSettings): boolean {
  if (settings.authMode !== "google" && settings.authMode !== "microsoft") {
    return false;
  }
  return Boolean(
    settings.oauthRefreshToken &&
      settings.oauthProvider === settings.authMode &&
      settings.oauthVerifiedEmail,
  );
}

export function websiteEmailConfigScore(settings: WebsiteEmailSettings): number {
  let score = 0;
  if (settings.enabled) score += 25;
  if (settings.host) score += 20;
  if (settings.fromEmail && isValidEmail(settings.fromEmail)) score += 20;
  if (settings.notifyEmail && isValidEmail(settings.notifyEmail)) score += 20;
  if (settings.authMode === "password") {
    if (settings.username) score += 5;
    if (settings.password) score += 10;
  } else if (isSmtpOauthVerified(settings)) {
    score += 15;
  } else if (settings.oauthClientId && settings.oauthClientSecret) {
    score += 5;
  }
  return Math.min(100, score);
}

export function smtpStatusLabel(settings: WebsiteEmailSettings): {
  label: string;
  tone: string;
} {
  if (!settings.enabled) {
    return { label: "Off", tone: "text-muted" };
  }
  if (
    (settings.authMode === "google" || settings.authMode === "microsoft") &&
    !isSmtpOauthVerified(settings)
  ) {
    return { label: "Verify OAuth", tone: "text-warn" };
  }
  if (
    settings.host &&
    settings.fromEmail &&
    isValidEmail(settings.fromEmail)
  ) {
    return { label: "Configured", tone: "text-ok" };
  }
  return { label: "Incomplete", tone: "text-warn" };
}
