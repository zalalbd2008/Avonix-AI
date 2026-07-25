"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FormError, SubmitButton } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { authClient } from "@/lib/auth/client";

/**
 * Route: /reset-password
 *
 * Better Auth mails a link to its own API, which validates the token and then
 * redirects here with `?token=`. An expired or reused token arrives as
 * `?error=INVALID_TOKEN` instead.
 */
function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token || linkError) {
    return (
      <>
        <h1 className="text-xl font-bold tracking-tight">Link expired</h1>
        <p className="mt-0.5 mb-5 text-[13px] text-muted">
          Reset links last one hour and work once.
        </p>
        <Link
          href="/forgot-password"
          className="block rounded-lg bg-brand py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Send a new link
        </Link>
      </>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const newPassword = String(data.get("password"));

    if (newPassword !== String(data.get("confirm"))) {
      setError("Those two passwords do not match.");
      return;
    }

    setPending(true);
    setError(null);

    const { error } = await authClient.resetPassword({
      newPassword,
      token: token!,
    });

    if (error) {
      setError(error.message ?? "Could not reset the password.");
      setPending(false);
      return;
    }
    router.push("/sign-in");
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">
        At least 8 characters
      </p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <PasswordField
          label="New password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm password"
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <SubmitButton pending={pending}>Set new password</SubmitButton>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
