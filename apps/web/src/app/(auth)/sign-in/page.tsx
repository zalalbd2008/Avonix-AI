"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { signIn } from "@/lib/auth/client";

export default function SignInPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const { error } = await signIn.email({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });

    if (error) {
      setError(error.message ?? "Could not sign in.");
      setPending(false);
      return;
    }
    // Where they land is decided by requireAgency(): dashboard if they have an
    // agency, onboarding if they do not.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">Welcome back to Avonix AI</p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="you@agency.com" />
        <Field label="Password" name="password" type="password" required autoComplete="current-password" />
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
