"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { authClient } from "@/lib/auth/client";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    if (error) {
      setError(error.message ?? "Could not send the reset link.");
      setPending(false);
      return;
    }
    setSent(true);
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Reset password</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">
        We&apos;ll email you a link to choose a new one
      </p>

      {sent ? (
        // Deliberately does not confirm whether the address exists — that would
        // turn this form into an account-enumeration oracle.
        <p className="rounded-lg bg-[#f0fdf9] px-3 py-2.5 text-[13px] text-ok">
          If that address has an account, a reset link is on its way. The link
          expires in one hour.
        </p>
      ) : (
        <form onSubmit={onSubmit}>
          <FormError message={error} />
          <Field
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@agency.com"
          />
          <SubmitButton pending={pending}>Send reset link</SubmitButton>
        </form>
      )}

      <Link
        href="/sign-in"
        className="mt-4 block text-center text-[12.5px] text-muted hover:text-navy"
      >
        ← Back to sign in
      </Link>
    </>
  );
}
