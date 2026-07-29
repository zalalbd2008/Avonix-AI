"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import type { SocialProviderId } from "@/lib/auth/social";

type Props = {
  google?: boolean;
  microsoft?: boolean;
  /** Sign-in vs sign-up copy. */
  mode?: "sign-in" | "sign-up" | "verify";
  callbackURL?: string;
};

/**
 * Google + Microsoft OAuth. Enable each by setting the matching env vars;
 * buttons only render when their public client id is present.
 */
export function SocialAuthButtons({
  google = false,
  microsoft = false,
  mode = "verify",
  callbackURL = "/home",
}: Props) {
  const [pending, setPending] = useState<SocialProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!google && !microsoft) return null;

  const label = (provider: "Google" | "Microsoft") => {
    if (mode === "sign-in") return `Sign in with ${provider}`;
    if (mode === "sign-up") return `Sign up with ${provider}`;
    return `Verify with ${provider}`;
  };

  async function start(provider: SocialProviderId) {
    setPending(provider);
    setError(null);
    const { error: oauthError } = await authClient.signIn.social({
      provider,
      callbackURL,
    });
    if (oauthError) {
      setError(oauthError.message ?? `${provider} sign-in failed.`);
      setPending(null);
    }
  }

  return (
    <div className="mb-4 space-y-2.5">
      {google ? (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void start("google")}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-[#dbe1ea] bg-white py-2.5 text-[14px] font-semibold text-ink hover:border-[#c3ccd9] hover:bg-[#f8fafc] disabled:opacity-60"
        >
          <GoogleGlyph />
          {pending === "google" ? "Redirecting…" : label("Google")}
        </button>
      ) : null}

      {microsoft ? (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void start("microsoft")}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-[#dbe1ea] bg-white py-2.5 text-[14px] font-semibold text-ink hover:border-[#c3ccd9] hover:bg-[#f8fafc] disabled:opacity-60"
        >
          <MicrosoftGlyph />
          {pending === "microsoft" ? "Redirecting…" : label("Microsoft")}
        </button>
      ) : null}

      {error ? (
        <p className="text-center text-[12.5px] text-bad">{error}</p>
      ) : null}

      <div className="flex items-center gap-3 pt-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
        <span className="h-px flex-1 bg-line" />
        or email
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.3 4.1-4.1 5.4l6.2 5.2C39.2 36.3 44 31.5 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function MicrosoftGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}
