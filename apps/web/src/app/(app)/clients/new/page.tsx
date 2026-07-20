"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createClient } from "@/lib/clients/create";

/** Route: /clients/new */
export default function NewClientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await createClient(new FormData(e.currentTarget));
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(`/clients/${result.clientId}` as never);
    router.refresh();
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="New client"
        subtitle="One business you work for. Their websites and leads live inside it."
      />
      <form onSubmit={onSubmit} className="rounded-xl border border-line bg-white p-5">
        <FormError message={error} />
        <Field label="Client name" name="name" required autoFocus placeholder="Harbour Dental" />
        <Field label="Contact email" name="contactEmail" type="email" placeholder="hello@harbourdental.com" />
        <Field label="Contact phone" name="contactPhone" placeholder="Optional" />
        <label className="mb-4 block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Notes</span>
          <textarea
            name="notes"
            rows={3}
            placeholder="Anything worth remembering about this client"
            className="w-full resize-y rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand"
          />
        </label>
        <div className="flex items-center gap-3">
          <div className="w-40">
            <SubmitButton pending={pending}>Create client</SubmitButton>
          </div>
          <Link href="/clients" className="text-[13px] font-medium text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
