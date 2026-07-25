"use client";

import { useState, useTransition } from "react";
import { setAutoRenewal } from "@/lib/billing/actions";

export function AutoRenewalToggle({
  enabled,
  canEdit,
  hasSubscription,
}: {
  enabled: boolean;
  canEdit: boolean;
  hasSubscription: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [on, setOn] = useState(enabled);

  return (
    <div>
      <button
        type="button"
        disabled={!canEdit || !hasSubscription || pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const next = !on;
            const r = await setAutoRenewal(next);
            if (!r.ok) {
              setError(r.error);
              return;
            }
            setOn(next);
          })
        }
        className={`relative h-8 w-14 rounded-full transition-colors disabled:opacity-50 ${
          on ? "bg-ok" : "bg-[#c3ccd9]"
        }`}
        aria-pressed={on}
        aria-label={on ? "Disable auto renewal" : "Enable auto renewal"}
      >
        <span
          className={`absolute top-1 size-6 rounded-full bg-white shadow transition-transform ${
            on ? "left-7" : "left-1"
          }`}
        />
      </button>
      <p className="mt-2 text-[13px] text-muted">
        {on
          ? "Subscription renews automatically at the end of each period."
          : "Auto renewal is off — access continues until the current period ends."}
      </p>
      {!hasSubscription ? (
        <p className="mt-1 text-[12px] text-faint">
          Available after you have an active paid subscription.
        </p>
      ) : null}
      {error ? <p className="mt-1 text-[12px] text-bad">{error}</p> : null}
    </div>
  );
}
