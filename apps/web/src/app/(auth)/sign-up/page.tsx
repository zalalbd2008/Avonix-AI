"use client";

import Link from "next/link";
import { useState } from "react";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { signUp } from "@/lib/auth/client";
import { validateSignupEmail } from "@/lib/email/email-policy";

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const google = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());
  const microsoft = Boolean(
    process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID?.trim(),
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const emailRaw = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    if (name.length < 2) {
      setError("Enter your name.");
      setPending(false);
      return;
    }

    const emailCheck = validateSignupEmail(emailRaw);
    if (!emailCheck.ok) {
      setError(emailCheck.error);
      setPending(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }

    const { error: signUpError } = await signUp.email({
      name,
      email: emailCheck.email,
      password,
      callbackURL: "/onboarding/agency",
    });

    if (signUpError) {
      setError(signUpError.message ?? "Could not create the account.");
      setPending(false);
      return;
    }

    window.location.assign(
      `/check-email?email=${encodeURIComponent(emailCheck.email)}`,
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">
        Verify with Google or Microsoft, or use email
      </p>
      <SocialAuthButtons
        google={google}
        microsoft={microsoft}
        mode="verify"
        callbackURL="/home"
      />
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field
          label="Your name"
          name="name"
          required
          autoComplete="name"
          placeholder="Your name"
        />
        <Field
          label="Work email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@agency.com"
        />
        <p className="mb-3 -mt-2 text-[11.5px] text-muted">
          Temporary / disposable addresses (Mailinator, Yopmail, 10MinuteMail,
          etc.) are blocked.
        </p>
        <PasswordField
          label="Password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
      <p className="mt-4 text-center text-[12.5px] text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
