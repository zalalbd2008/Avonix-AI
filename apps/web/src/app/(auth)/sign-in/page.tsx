"use client";

import Link from "next/link";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { signIn } from "@/lib/auth/client";

export default function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setUnverifiedEmail(null);

    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const { error: signInError } = await signIn.email({
      email,
      password: String(data.get("password")),
    });

    if (signInError) {
      const msg = signInError.message ?? "Could not sign in.";
      const needsVerify =
        /verif/i.test(msg) ||
        /confirm/i.test(msg) ||
        signInError.code === "EMAIL_NOT_VERIFIED";
      if (needsVerify) {
        setUnverifiedEmail(email);
        setError("Confirm your email before signing in.");
      } else {
        setError(msg);
      }
      setPending(false);
      return;
    }

    // Full page load so the new session cookie is applied. Soft router.push +
    // refresh after sign-in was leaving the tab hung (no /home request).
    window.location.assign("/home");
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">Welcome back to Avonix AI</p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        {unverifiedEmail ? (
          <p className="mb-3 rounded-lg bg-[#fff8f3] px-3 py-2.5 text-[12.5px] text-muted">
            Check your inbox, then{" "}
            <Link
              href={
                `/check-email?email=${encodeURIComponent(unverifiedEmail)}` as never
              }
              className="font-semibold text-brand hover:underline"
            >
              resend the confirmation link
            </Link>
            .
          </p>
        ) : null}
        <Field
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@agency.com"
        />
        <PasswordField
          label="Password"
          name="password"
          required
          autoComplete="current-password"
        />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
      <div className="mt-4 flex justify-between text-[12.5px]">
        <Link href="/forgot-password" className="font-medium text-muted hover:text-navy">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="font-semibold text-brand hover:underline">
          Create account →
        </Link>
      </div>
    </>
  );
}
