/**
 * Browser-safe security config helpers.
 * Enforcement (OTP HMAC, rate limits, captcha verify) stays in `security.ts`.
 */
import type { FormCaptchaProvider, FormSecurityConfig } from "@/lib/db/schema";

export const DEFAULT_SECURITY: FormSecurityConfig = {
  honeypot: true,
  captcha: { provider: "none", siteKey: "", secretKey: "" },
  rateLimit: { enabled: true, maxPerHour: 30 },
  ipBlock: { mode: "block", ips: [] },
  countryBlock: { mode: "block", countries: [] },
  emailVerification: { enabled: false, blockDisposable: true },
  otp: { enabled: false, ttlMinutes: 10 },
};

export function normalizeSecurity(
  raw?: FormSecurityConfig | null,
): FormSecurityConfig {
  const provider: FormCaptchaProvider =
    raw?.captcha?.provider === "recaptcha_v2" ||
    raw?.captcha?.provider === "turnstile"
      ? raw.captcha.provider
      : "none";

  const ips = (raw?.ipBlock?.ips ?? [])
    .map((ip) => ip.trim())
    .filter(Boolean)
    .slice(0, 100);

  const countries = (raw?.countryBlock?.countries ?? [])
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{2}$/.test(c))
    .slice(0, 80);

  const maxPerHour = clampInt(raw?.rateLimit?.maxPerHour, 1, 500, 30);
  const ttlMinutes = clampInt(raw?.otp?.ttlMinutes, 5, 60, 10);

  return {
    honeypot: raw?.honeypot !== false,
    captcha: {
      provider,
      siteKey: (raw?.captcha?.siteKey ?? "").trim().slice(0, 200),
      secretKey: (raw?.captcha?.secretKey ?? "").trim().slice(0, 200),
    },
    rateLimit: {
      enabled: raw?.rateLimit?.enabled !== false,
      maxPerHour,
    },
    ipBlock: {
      mode: raw?.ipBlock?.mode === "allow" ? "allow" : "block",
      ips,
    },
    countryBlock: {
      mode: raw?.countryBlock?.mode === "allow" ? "allow" : "block",
      countries,
    },
    emailVerification: {
      enabled: Boolean(raw?.emailVerification?.enabled),
      blockDisposable: raw?.emailVerification?.blockDisposable !== false,
    },
    otp: {
      enabled: Boolean(raw?.otp?.enabled),
      ttlMinutes,
    },
  };
}

/** Public captcha bits safe to put in the embed. */
export function publicSecurityForEmbed(security: FormSecurityConfig): {
  honeypot: boolean;
  captchaProvider: FormCaptchaProvider;
  captchaSiteKey: string;
  otpEnabled: boolean;
  emailVerification: boolean;
} {
  const s = normalizeSecurity(security);
  return {
    honeypot: s.honeypot !== false,
    captchaProvider: s.captcha?.provider ?? "none",
    captchaSiteKey: s.captcha?.siteKey ?? "",
    otpEnabled: Boolean(s.otp?.enabled),
    emailVerification: Boolean(s.emailVerification?.enabled),
  };
}

function clampInt(
  v: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
