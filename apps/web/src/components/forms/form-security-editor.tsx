"use client";

import type { FormCaptchaProvider, FormSecurityConfig } from "@/lib/db/schema";
import {
  DEFAULT_SECURITY,
  normalizeSecurity,
} from "@/lib/forms/security-config";

/**
 * Form-level security — honeypot, captcha, rate limit, IP/country, OTP.
 */
export function FormSecurityEditor({
  value,
  onChange,
}: {
  value: FormSecurityConfig;
  onChange: (next: FormSecurityConfig) => void;
}) {
  const security = normalizeSecurity(value);

  function patch(partial: Partial<FormSecurityConfig>) {
    onChange(normalizeSecurity({ ...security, ...partial }));
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Security
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Honeypot, captcha (reCAPTCHA / Turnstile), per-IP rate limits, IP /
        country rules, disposable email block, and optional email OTP.
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={security.honeypot !== false}
          onChange={(e) => patch({ honeypot: e.target.checked })}
        />
        Honeypot field (bots fill it → silent drop)
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Captcha provider
        </span>
        <select
          value={security.captcha?.provider ?? "none"}
          onChange={(e) =>
            patch({
              captcha: {
                ...security.captcha,
                provider: e.target.value as FormCaptchaProvider,
              },
            })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          <option value="none">None</option>
          <option value="turnstile">Cloudflare Turnstile</option>
          <option value="recaptcha_v2">Google reCAPTCHA v2</option>
        </select>
      </label>

      {(security.captcha?.provider ?? "none") !== "none" ? (
        <>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Site key (public)
            </span>
            <input
              value={security.captcha?.siteKey ?? ""}
              onChange={(e) =>
                patch({
                  captcha: { ...security.captcha, siteKey: e.target.value },
                })
              }
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
              placeholder="0x… or 6L…"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Secret key
            </span>
            <input
              type="password"
              value={security.captcha?.secretKey ?? ""}
              onChange={(e) =>
                patch({
                  captcha: { ...security.captcha, secretKey: e.target.value },
                })
              }
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
              placeholder="Stored on the form · or use env fallback"
            />
          </label>
        </>
      ) : null}

      <div className="border-t border-[#edf0f5] pt-3">
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={security.rateLimit?.enabled !== false}
            onChange={(e) =>
              patch({
                rateLimit: {
                  ...security.rateLimit,
                  enabled: e.target.checked,
                },
              })
            }
          />
          Per-IP rate limit
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Max submissions / hour / IP
          </span>
          <input
            type="number"
            min={1}
            max={500}
            value={security.rateLimit?.maxPerHour ?? 30}
            onChange={(e) =>
              patch({
                rateLimit: {
                  ...security.rateLimit,
                  maxPerHour: Number(e.target.value),
                },
              })
            }
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="border-t border-[#edf0f5] pt-3">
        <label className="mb-2 block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            IP list mode
          </span>
          <select
            value={security.ipBlock?.mode ?? "block"}
            onChange={(e) =>
              patch({
                ipBlock: {
                  ...security.ipBlock,
                  mode: e.target.value as "block" | "allow",
                },
              })
            }
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          >
            <option value="block">Block listed IPs</option>
            <option value="allow">Allow only listed IPs</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            IPs (comma-separated)
          </span>
          <input
            value={(security.ipBlock?.ips ?? []).join(", ")}
            onChange={(e) =>
              patch({
                ipBlock: {
                  ...security.ipBlock,
                  ips: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                },
              })
            }
            placeholder="203.0.113.10, 198.51.100.2"
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="border-t border-[#edf0f5] pt-3">
        <label className="mb-2 block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Country list mode
          </span>
          <select
            value={security.countryBlock?.mode ?? "block"}
            onChange={(e) =>
              patch({
                countryBlock: {
                  ...security.countryBlock,
                  mode: e.target.value as "block" | "allow",
                },
              })
            }
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          >
            <option value="block">Block listed countries</option>
            <option value="allow">Allow only listed countries</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Country codes (ISO, comma-separated)
          </span>
          <input
            value={(security.countryBlock?.countries ?? []).join(", ")}
            onChange={(e) =>
              patch({
                countryBlock: {
                  ...security.countryBlock,
                  countries: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                },
              })
            }
            placeholder="CN, RU, KP"
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
          />
        </label>
        <p className="mt-1 text-[11px] text-faint">
          Uses CDN country headers (e.g. Vercel). Empty list = no country filter.
        </p>
      </div>

      <div className="border-t border-[#edf0f5] pt-3">
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(security.emailVerification?.enabled)}
            onChange={(e) =>
              patch({
                emailVerification: {
                  ...security.emailVerification,
                  enabled: e.target.checked,
                },
              })
            }
          />
          Email verification rules
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={security.emailVerification?.blockDisposable !== false}
            disabled={!security.emailVerification?.enabled}
            onChange={(e) =>
              patch({
                emailVerification: {
                  ...security.emailVerification,
                  blockDisposable: e.target.checked,
                },
              })
            }
          />
          Block disposable email domains
        </label>
      </div>

      <div className="border-t border-[#edf0f5] pt-3">
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(security.otp?.enabled)}
            onChange={(e) =>
              patch({
                otp: { ...security.otp, enabled: e.target.checked },
              })
            }
          />
          Email OTP before submit
        </label>
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Code lifetime (minutes)
          </span>
          <input
            type="number"
            min={5}
            max={60}
            disabled={!security.otp?.enabled}
            value={security.otp?.ttlMinutes ?? 10}
            onChange={(e) =>
              patch({
                otp: {
                  ...security.otp,
                  ttlMinutes: Number(e.target.value),
                },
              })
            }
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand disabled:opacity-50"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => onChange(normalizeSecurity(DEFAULT_SECURITY))}
        className="self-start text-[11.5px] font-semibold text-muted hover:text-brand"
      >
        Reset security defaults
      </button>
    </div>
  );
}
