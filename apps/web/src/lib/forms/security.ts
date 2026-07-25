import { createHmac, timingSafeEqual } from "node:crypto";
import type { FormSecurityConfig } from "@/lib/db/schema";
import { rateLimit } from "@/lib/connector/rate-limit";
import { sendEmail } from "@/lib/email";
import { isDisposableEmailDomain } from "@/lib/email/email-policy";
import { normalizeSecurity } from "./security-config";

export {
  DEFAULT_SECURITY,
  normalizeSecurity,
  publicSecurityForEmbed,
} from "./security-config";

export type SecurityCheckContext = {
  formId: string;
  security: FormSecurityConfig;
  ip: string | null;
  country: string | null;
  email: string | null;
  captchaToken?: string | null;
  otp?: string | null;
  /** Skip OTP verify (e.g. when only requesting a code). */
  skipOtpVerify?: boolean;
};

export type SecurityCheckResult =
  | { ok: true }
  | { ok: false; code: string; message: string; status?: number };

/**
 * Enforce form-level security before creating a lead.
 */
export async function enforceFormSecurity(
  ctx: SecurityCheckContext,
): Promise<SecurityCheckResult> {
  const s = normalizeSecurity(ctx.security);

  if (s.rateLimit?.enabled !== false) {
    const max = s.rateLimit?.maxPerHour ?? 30;
    const key = `form-submit:${ctx.formId}:${ctx.ip || "unknown"}`;
    const limit = await rateLimit(key, max, 3600);
    if (!limit.ok) {
      return {
        ok: false,
        code: "rate_limited",
        message: "Too many submissions from this network. Try again later.",
        status: 429,
      };
    }
  }

  const ipCheck = checkIpList(s, ctx.ip);
  if (!ipCheck.ok) return ipCheck;

  const countryCheck = checkCountryList(s, ctx.country);
  if (!countryCheck.ok) return countryCheck;

  if (s.emailVerification?.enabled && ctx.email) {
    const emailCheck = checkEmailRules(s, ctx.email);
    if (!emailCheck.ok) return emailCheck;
  }

  const captcha = await verifyCaptcha(s, ctx.captchaToken);
  if (!captcha.ok) return captcha;

  if (s.otp?.enabled && !ctx.skipOtpVerify) {
    if (!ctx.email) {
      return {
        ok: false,
        code: "otp_required",
        message: "Email is required for verification.",
        status: 400,
      };
    }
    if (!ctx.otp?.trim()) {
      return {
        ok: false,
        code: "otp_required",
        message: "Enter the verification code sent to your email.",
        status: 400,
      };
    }
    if (!verifyOtpCode(ctx.formId, ctx.email, ctx.otp, s.otp.ttlMinutes ?? 10)) {
      return {
        ok: false,
        code: "otp_invalid",
        message: "That verification code is invalid or expired.",
        status: 400,
      };
    }
  }

  return { ok: true };
}

function checkIpList(
  s: FormSecurityConfig,
  ip: string | null,
): SecurityCheckResult {
  const list = s.ipBlock?.ips ?? [];
  if (!list.length) return { ok: true };
  const mode = s.ipBlock?.mode ?? "block";
  const hit = Boolean(ip && list.includes(ip));
  if (mode === "block" && hit) {
    return {
      ok: false,
      code: "ip_blocked",
      message: "Submissions from this network are not allowed.",
      status: 403,
    };
  }
  if (mode === "allow" && !hit) {
    return {
      ok: false,
      code: "ip_blocked",
      message: "Submissions from this network are not allowed.",
      status: 403,
    };
  }
  return { ok: true };
}

function checkCountryList(
  s: FormSecurityConfig,
  country: string | null,
): SecurityCheckResult {
  const list = s.countryBlock?.countries ?? [];
  if (!list.length) return { ok: true };
  const mode = s.countryBlock?.mode ?? "block";
  const code = country?.toUpperCase() ?? null;
  const hit = Boolean(code && list.includes(code));
  if (mode === "block" && hit) {
    return {
      ok: false,
      code: "country_blocked",
      message: "Submissions from your region are not allowed.",
      status: 403,
    };
  }
  if (mode === "allow" && !hit) {
    return {
      ok: false,
      code: "country_blocked",
      message: "Submissions from your region are not allowed.",
      status: 403,
    };
  }
  return { ok: true };
}

function checkEmailRules(
  s: FormSecurityConfig,
  email: string,
): SecurityCheckResult {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain) {
    return {
      ok: false,
      code: "email_invalid",
      message: "That email is not valid.",
      status: 400,
    };
  }
  if (s.emailVerification?.blockDisposable !== false && isDisposableEmailDomain(domain)) {
    return {
      ok: false,
      code: "email_blocked",
      message: "Please use a permanent email address.",
      status: 400,
    };
  }
  return { ok: true };
}

async function verifyCaptcha(
  s: FormSecurityConfig,
  token?: string | null,
): Promise<SecurityCheckResult> {
  const provider = s.captcha?.provider ?? "none";
  if (provider === "none") return { ok: true };

  const secret =
    s.captcha?.secretKey?.trim() ||
    (provider === "turnstile"
      ? process.env.TURNSTILE_SECRET_KEY?.trim()
      : process.env.RECAPTCHA_SECRET_KEY?.trim()) ||
    "";

  if (!secret) {
    // Misconfigured — fail closed so a forgotten secret does not silently open the form.
    return {
      ok: false,
      code: "captcha_misconfigured",
      message: "Captcha is enabled but not configured on the server.",
      status: 503,
    };
  }

  if (!token?.trim()) {
    return {
      ok: false,
      code: "captcha_required",
      message: "Please complete the captcha.",
      status: 400,
    };
  }

  try {
    const endpoint =
      provider === "turnstile"
        ? "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        : "https://www.google.com/recaptcha/api/siteverify";
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
    });
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return {
        ok: false,
        code: "captcha_failed",
        message: "Captcha verification failed. Try again.",
        status: 400,
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      code: "captcha_failed",
      message: "Captcha verification failed. Try again.",
      status: 400,
    };
  }
}

function otpSecret(): string {
  return (
    process.env.FORM_OTP_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "avonix-form-otp-dev"
  );
}

/** 6-digit code for the current time window. */
export function generateOtpCode(
  formId: string,
  email: string,
  ttlMinutes = 10,
  at = Date.now(),
): string {
  const window = Math.floor(at / (ttlMinutes * 60_000));
  const digest = createHmac("sha256", otpSecret())
    .update(`${formId}:${email.toLowerCase()}:${window}`)
    .digest("hex");
  const n = Number.parseInt(digest.slice(0, 8), 16) % 1_000_000;
  return String(n).padStart(6, "0");
}

export function verifyOtpCode(
  formId: string,
  email: string,
  code: string,
  ttlMinutes = 10,
): boolean {
  const cleaned = code.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const now = Date.now();
  for (const skew of [0, -1, 1]) {
    const expected = generateOtpCode(
      formId,
      email,
      ttlMinutes,
      now + skew * ttlMinutes * 60_000,
    );
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(cleaned);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      /* ignore */
    }
  }
  return false;
}

export async function sendFormOtpEmail(opts: {
  to: string;
  formName: string;
  code: string;
  ttlMinutes: number;
}): Promise<void> {
  await sendEmail({
    to: opts.to,
    subject: `Your verification code — ${opts.formName}`,
    html: `<p style="font-family:system-ui,sans-serif;font-size:15px;color:#13233c">Your verification code for <strong>${escapeHtml(opts.formName)}</strong> is:</p>
<p style="font-family:ui-monospace,monospace;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#ff6600">${escapeHtml(opts.code)}</p>
<p style="font-family:system-ui,sans-serif;font-size:13px;color:#5b6b83">Valid for ${opts.ttlMinutes} minutes. If you did not request this, ignore this email.</p>`,
    text: `Your verification code for ${opts.formName} is ${opts.code}. Valid for ${opts.ttlMinutes} minutes.`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
