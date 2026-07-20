"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { signUp } from "@/lib/auth/client";

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const { error } = await signUp.email({
      name: String(data.get("name")),
      email: String(data.get("email")),
      password: String(data.get("password")),
    });

    if (error) {
      setError(error.message ?? "Could not create the account.");
      setPending(false);
      return;
    }
    // A new user has no agency yet, so onboarding is the only sensible landing.
    router.push("/onboarding/agency");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">Start with one client, free</p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Your name" name="name" required autoComplete="name" placeholder="Your name" />
        <Field label="Email" name="email" type="email" required autoComplete="email" placeholder="you@agency.com" />
        <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
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
