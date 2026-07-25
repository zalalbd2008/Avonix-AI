"use client";

import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createClient } from "@/lib/clients/create";

/** Route: /onboarding/client — step 3 */
export default function CreateClientStep() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await createClient(new FormData(e.currentTarget));
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      window.location.assign(
        `/onboarding/website?client=${encodeURIComponent(result.clientId)}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-[-0.02em]">Add your first client</h1>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">
        One business you work for. Their websites, contacts and pipeline all live
        inside it.
      </p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Client name" name="name" required autoFocus placeholder="Harbour Dental" />
        <Field label="Their email" name="contactEmail" type="email" placeholder="hello@harbourdental.com" />
        <SubmitButton pending={pending}>Continue</SubmitButton>
      </form>
    </>
  );
}
