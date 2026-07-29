"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createShareLink } from "@/lib/reports/actions";

/**
 * Prototype's "Share Report ↗" — opens the live public link, creating it first
 * if this website has never shared before.
 */
export function ShareReportButton({
  clientId,
  websiteId,
  appUrl,
  slug,
  enabled,
}: {
  clientId: string;
  websiteId: string;
  appUrl: string;
  slug: string | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function share() {
    setPending(true);
    setError(null);

    let nextSlug = slug;
    if (!nextSlug) {
      const result = await createShareLink(clientId, websiteId);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      nextSlug = result.slug;
      router.refresh();
    }

    if (!enabled && slug) {
      // Link exists but is off — send them to Reports to turn it on rather than
      // opening a 404-ish empty page.
      router.push(`/clients/${clientId}/websites/${websiteId}/reports` as never);
      setPending(false);
      return;
    }

    window.open(`${appUrl}/r/${nextSlug}`, "_blank", "noopener,noreferrer");
    setPending(false);
  }

  return (
    <div className="flex w-full flex-col gap-1 sm:w-auto sm:items-end">
      <button
        type="button"
        disabled={pending}
        onClick={share}
        className="w-full cursor-pointer rounded-lg bg-brand px-3.5 py-2.5 text-center text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Opening…" : "Share Report ↗"}
      </button>
      {error && <p className="text-[12px] font-medium text-bad">{error}</p>}
    </div>
  );
}
