"use client";

import { useState, useTransition } from "react";
import { runOwnerBillingTool } from "@/lib/billing/actions";
import type { BillingOverrides } from "@/lib/billing/profile";

const ACTIONS: {
  id: Parameters<typeof runOwnerBillingTool>[0];
  label: string;
}[] = [
  { id: "grant_complimentary", label: "Grant complimentary (Professional)" },
  { id: "clear_complimentary", label: "Clear complimentary" },
  { id: "extend_30", label: "Extend +30 days" },
  { id: "bonus_credits", label: "+10,000 AI credits" },
  { id: "bonus_websites", label: "+10 websites" },
  { id: "override_limits", label: "Workspace limit → 50" },
  { id: "suspend", label: "Suspend" },
  { id: "resume", label: "Resume" },
];

export function OwnerBillingTools({
  overrides,
}: {
  overrides: BillingOverrides;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const notes = [
    overrides.complimentary
      ? `Complimentary: ${overrides.complimentaryPlan ?? "yes"}`
      : null,
    overrides.suspended ? "Currently suspended" : null,
    overrides.bonusAiCredits
      ? `Bonus AI: ${overrides.bonusAiCredits}`
      : null,
    overrides.bonusWebsites
      ? `Bonus websites: ${overrides.bonusWebsites}`
      : null,
    overrides.maxClients != null
      ? `Workspace override: ${overrides.maxClients}`
      : null,
  ].filter(Boolean);

  return (
    <div>
      {notes.length ? (
        <ul className="mb-3 space-y-1 text-[12px] text-muted">
          {notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setMsg(null);
                const r = await runOwnerBillingTool(
                  a.id,
                  a.id === "override_limits" ? { maxClients: 50 } : undefined,
                );
                setMsg(r.ok ? "Done." : r.error);
              })
            }
            className="rounded-md border border-[#e8edf5] px-2.5 py-1 text-[12px] font-medium text-ink hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {a.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11.5px] text-muted">
        Manual invoice / refund: Stripe dashboard. Lifetime not enabled yet.
      </p>
      {msg ? <p className="mt-2 text-[12.5px] text-muted">{msg}</p> : null}
    </div>
  );
}
