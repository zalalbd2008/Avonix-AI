import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 15 * 60 * 1000;

function secret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.SMTP_OAUTH_STATE_SECRET?.trim() ||
    "dev-smtp-oauth-state"
  );
}

export type SmtpOauthState = {
  websiteId: string;
  clientId: string;
  provider: "google" | "microsoft";
  exp: number;
};

export function signSmtpOauthState(payload: Omit<SmtpOauthState, "exp">): string {
  const body: SmtpOauthState = {
    ...payload,
    exp: Date.now() + STATE_TTL_MS,
  };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifySmtpOauthState(raw: string): SmtpOauthState | null {
  const [json, sig] = raw.split(".");
  if (!json || !sig) return null;
  const expected = createHmac("sha256", secret()).update(json).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(json, "base64url").toString("utf8"),
    ) as SmtpOauthState;
    if (!parsed.websiteId || !parsed.clientId || !parsed.provider) return null;
    if (parsed.provider !== "google" && parsed.provider !== "microsoft") {
      return null;
    }
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function smtpOauthCallbackUrl(provider: "google" | "microsoft") {
  return `${appBaseUrl()}/api/website-email/oauth/${provider}/callback`;
}

export const GOOGLE_SMTP_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://mail.google.com/",
].join(" ");

export const MICROSOFT_SMTP_SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "https://outlook.office.com/SMTP.Send",
].join(" ");
