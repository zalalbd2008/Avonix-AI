"use client";

import { useState } from "react";
import { openBillingPortal, startCheckout } from "@/lib/billing/actions";

export function UpgradeButton({
  plan,
  label,
  disabled,
}: {
  plan: "pro" | "agency";
  label: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        disabled={pending || disabled}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await startCheckout(plan);
          if (!result.ok) {
            setError(result.error);
            setPending(false);
            return;
          }
          window.location.href = result.url;
        }}
        className="w-full cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {pending ? "Opening…" : label}
      </button>
      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
    </>
  );
}

export function ManageBillingButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await openBillingPortal();
          if (!result.ok) {
            setError(result.error);
            setPending(false);
            return;
          }
          window.location.href = result.url;
        }}
        className="cursor-pointer rounded-lg border-[1.5px] border-[#dbe1ea] px-3.5 py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-50"
      >
        {pending ? "Opening…" : "Manage billing"}
      </button>
      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
    </>
  );
}
