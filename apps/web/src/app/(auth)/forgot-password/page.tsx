"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, SubmitButton } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Reset password</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">
        We&apos;ll email you a reset link
      </p>

      {sent ? (
        <p className="rounded-lg bg-[#f0fdf9] px-3 py-2.5 text-[13px] text-ok">
          If that address has an account, a reset link is on its way.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            // Deliberately inert until an email sender exists. Better Auth's
            // requestPasswordReset needs somewhere to deliver to; wiring the
            // call before then would fail silently, which is worse than an
            // honest placeholder.
            setSent(true);
          }}
        >
          <Field label="Email" name="email" type="email" required placeholder="you@agency.com" />
          <SubmitButton>Send reset link</SubmitButton>
        </form>
      )}

      <Link href="/sign-in" className="mt-4 block text-center text-[12.5px] text-muted hover:text-navy">
        ← Back to sign in
      </Link>
    </>
  );
}
