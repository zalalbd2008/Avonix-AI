"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

/**
 * Post sign-up: confirm email before any account setup.
 * Works without a session — requireEmailVerification blocks sign-in until confirmed.
 *
 * Locally (no RESEND_API_KEY), messages are written to apps/web/.mail/ — this
 * page surfaces the latest link so you are not stuck waiting on Gmail.
 */
function CheckEmailBody() {
  const params = useSearchParams();
  const email = (params.get("email") ?? "").trim().toLowerCase();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [devHint, setDevHint] = useState<string | null>(null);

  async function loadDevLink() {
    if (!email || process.env.NODE_ENV === "production") return;
    try {
      const res = await fetch(
        `/api/dev/latest-mail?to=${encodeURIComponent(email)}`,
      );
      const data = (await res.json()) as {
        found?: boolean;
        link?: string | null;
        hint?: string;
      };
      if (data.found && data.link) {
        setDevLink(data.link);
        setDevHint(null);
      } else {
        setDevLink(null);
        setDevHint(data.hint ?? null);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void loadDevLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Confirm your email</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">
        We sent a confirmation link
        {email ? (
          <>
            {" "}
            to <b className="text-ink">{email}</b>
          </>
        ) : null}
        . Open it to continue account setup.
      </p>

      <div className="mb-4 rounded-xl border border-line bg-[#f7f8fb] px-4 py-3.5 text-[13px] leading-[1.55] text-muted">
        <p>
          Until you confirm, you can&apos;t sign in or create an agency. Check
          spam if you don&apos;t see the message within a minute.
        </p>
        <p className="mt-2 text-[12px]">
          <b className="text-ink">Local tip:</b> real inbox delivery needs{" "}
          <code className="text-ink">RESEND_API_KEY</code> +{" "}
          <code className="text-ink">EMAIL_FROM</code> in{" "}
          <code className="text-ink">.env.local</code>. Without them, mail is
          saved under <code className="text-ink">apps/web/.mail/</code> only.
        </p>
        <p className="mt-2 text-[12px]">
          Platform Owner emails are already verified and cannot be used for
          Organization Admin signup — use a different address.
        </p>
      </div>

      {devLink ? (
        <a
          href={devLink}
          className="mb-3 block rounded-lg bg-brand py-2.5 text-center text-[14px] font-semibold text-white hover:bg-brand-dark"
        >
          Open local verification link →
        </a>
      ) : null}
      {devHint ? (
        <p className="mb-3 rounded-lg bg-[#fff8f3] px-3 py-2.5 text-[12.5px] text-muted">
          {devHint}
        </p>
      ) : null}

      {error ? (
        <p className="mb-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-[12.5px] text-bad">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          disabled={!email || pending || sent}
          onClick={async () => {
            if (!email) return;
            setPending(true);
            setError(null);
            const { error: resendError } = await authClient.sendVerificationEmail(
              {
                email,
                callbackURL: "/onboarding/agency",
              },
            );
            setPending(false);
            if (resendError) {
              setError(resendError.message ?? "Could not resend.");
              return;
            }
            setSent(true);
            await loadDevLink();
          }}
          className="w-full rounded-lg border-[1.5px] border-[#dbe1ea] py-2.5 text-[14px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {sent ? "Link sent again" : pending ? "Sending…" : "Resend confirmation"}
        </button>
        <Link
          href="/sign-in"
          className="block text-center text-[13px] font-semibold text-brand hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailBody />
    </Suspense>
  );
}
