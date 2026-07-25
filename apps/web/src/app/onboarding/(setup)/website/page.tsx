"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createWebsite } from "@/lib/websites/actions";

/** Route: /onboarding/website — step 4 */
function AddWebsiteForm() {
  const clientId = useSearchParams().get("client") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const result = await createWebsite(
        clientId,
        new FormData(e.currentTarget),
      );
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      // The key is shown once, on the next step — so it travels in the URL rather
      // than being fetched again, because it cannot be fetched again.
      window.location.assign(
        `/onboarding/plugin?key=${encodeURIComponent(result.connectorKey)}`,
      );
    } catch {
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-[-0.02em]">
        Add their website
      </h1>
      <p className="mt-0.5 mb-4 text-[13px] text-muted">
        The WordPress site their leads come from.
      </p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field
          label="Website name"
          name="name"
          required
          autoFocus
          placeholder="Main site"
        />
        <Field
          label="Address"
          name="url"
          required
          placeholder="harbourdental.com"
        />
        <SubmitButton pending={pending}>Continue</SubmitButton>
      </form>
    </>
  );
}

export default function AddWebsiteStep() {
  return (
    <Suspense fallback={null}>
      <AddWebsiteForm />
    </Suspense>
  );
}
