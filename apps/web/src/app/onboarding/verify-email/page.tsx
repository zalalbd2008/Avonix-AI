"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";

/** Route: /onboarding/verify-email — step 1 (gate before agency setup) */
export default function VerifyEmailStep() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [sent, setSent] = useState(false);
  const [resendPending, setResendPending] = useState(false);

  const verified = Boolean(session?.user.emailVerified);
  const email = session?.user.email ?? "";

  useEffect(() => {
    if (!verified) return;
    // Confirmed — move into account setup.
    window.location.assign("/onboarding/agency");
  }, [verified]);

  useEffect(() => {
    if (verified) return;
    const id = setInterval(() => {
      void refetch();
    }, 4000);
    return () => clearInterval(id);
  }, [verified, refetch]);

  if (isPending) {
    return <p className="text-[13px] text-muted">Loading…</p>;
  }

  if (!session?.user) {
    return (
      <>
        <h1 className="text-[19px] font-bold tracking-[-0.02em]">
          Confirm your email
        </h1>
        <p className="mt-0.5 mb-4 text-[13px] text-muted">
          Sign in after you open the confirmation link we sent.
        </p>
        <a
          href="/sign-in"
          className="block rounded-lg bg-brand py-2.5 text-center text-[14px] font-semibold text-white hover:bg-brand-dark"
        >
          Go to sign in
        </a>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-[-0.02em]">
        Confirm your email
      </h1>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">
        We sent a confirmation link to{" "}
        <b className="text-ink">{email || "your address"}</b>. You can&apos;t set
        up the agency until this is confirmed.
      </p>

      {verified ? (
        <p className="mb-4 rounded-lg bg-ok/10 px-3 py-2.5 text-[13px] text-ok">
          Confirmed. Continuing to setup…
        </p>
      ) : (
        <p className="mb-4 rounded-lg bg-[#fff8f3] px-3 py-2.5 text-[12.5px] text-muted">
          Open the link in your inbox (and spam). This page updates
          automatically once you confirm.
          {process.env.NODE_ENV === "development" ? (
            <>
              {" "}
              Dev: see <code className="text-ink">apps/web/.mail/</code>.
            </>
          ) : null}
        </p>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={!verified}
          onClick={() => window.location.assign("/onboarding/agency")}
          className="flex-1 cursor-pointer rounded-lg bg-brand py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {verified ? "Continuing…" : "Waiting for confirmation…"}
        </button>
        <button
          type="button"
          disabled={sent || resendPending || !email || verified}
          onClick={async () => {
            setResendPending(true);
            await authClient.sendVerificationEmail({
              email,
              callbackURL: "/onboarding/agency",
            });
            setResendPending(false);
            setSent(true);
          }}
          className="cursor-pointer rounded-lg border-[1.5px] border-[#dbe1ea] px-3.5 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {sent ? "Sent" : resendPending ? "…" : "Resend"}
        </button>
      </div>
    </>
  );
}
