"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createAgency } from "@/lib/agency/create";

export default function CreateAgencyStep() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await createAgency(new FormData(e.currentTarget));
    if ("error" in result && result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-tight">Name your agency</h1>
      <p className="mt-0.5 mb-4.5 text-[13px] text-muted">
        This is the account that owns your clients, their websites, and billing.
      </p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field label="Agency name" name="name" required placeholder="Northwind Digital" autoFocus />
        <SubmitButton pending={pending}>Create agency</SubmitButton>
      </form>
    </>
  );
}
