"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ConnectorKeyPanel } from "@/components/connector-key";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createWebsite } from "@/lib/websites/actions";

/** Route: /clients/[clientId]/websites/new */
export default function NewWebsitePage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ id: string; key: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await createWebsite(clientId, new FormData(e.currentTarget));
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    // Deliberately not redirecting: the key is shown once and navigating away
    // would lose it.
    setCreated({ id: result.websiteId, key: result.connectorKey });
    setPending(false);
  }

  if (created) {
    return (
      <div className="max-w-xl">
        <PageHeader title="Website added" subtitle="One step left — install the plugin" />
        <ConnectorKeyPanel value={created.key} />
        <Link
          href={`/clients/${clientId}/websites/${created.id}` as never}
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
        >
          Installation steps →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Add website"
        subtitle="A WordPress site belonging to this client. Leads from it land in this client's inbox."
      />
      <form onSubmit={onSubmit} className="rounded-xl border border-line bg-white p-5">
        <FormError message={error} />
        <Field label="Website name" name="name" required autoFocus placeholder="Main site" />
        <Field label="Address" name="url" required placeholder="harbourdental.com" />
        <div className="flex items-center gap-3">
          <div className="w-44">
            <SubmitButton pending={pending}>Add website</SubmitButton>
          </div>
          <Link href={`/clients/${clientId}` as never} className="text-[13px] font-medium text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
