"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  resumeOnboardingCheckout,
  syncOnboardingBilling,
  switchToPaidOrganization,
} from "@/lib/billing/onboarding";
import { CATALOG_PLANS, formatMoney } from "@/lib/billing/catalog";

const SELF_SERVE = CATALOG_PLANS.filter((p) => !p.contactSales);

/**
 * Unpaid org gate — complete Stripe Checkout before using the workspace.
 * Complimentary orgs (Platform Owner) never land here.
 */
export default function OnboardingBillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const upgraded = searchParams.get("upgraded") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [plan, setPlan] = useState("professional");
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [syncing, setSyncing] = useState(upgraded);

  useEffect(() => {
    if (!upgraded) return;
    let cancelled = false;
    (async () => {
      const result = await syncOnboardingBilling();
      if (cancelled) return;
      if (result.ok && result.paid) {
        const next = searchParams.get("next");
        router.replace(
          (next && next.startsWith("/") ? next : "/onboarding/client") as never,
        );
        return;
      }
      setSyncing(false);
      if (!result.ok) setError(result.error);
      else
        setError(
          "Payment is still confirming. Use the button below to retry checkout, or wait a moment and refresh.",
        );
    })();
    return () => {
      cancelled = true;
    };
  }, [upgraded, router, searchParams]);

  if (syncing) {
    return (
      <>
        <h1 className="text-[19px] font-bold tracking-tight">
          Confirming payment…
        </h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Stripe is activating your subscription. This usually takes a few
          seconds.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-tight">
        Activate your plan
      </h1>
      <p className="mt-0.5 mb-4.5 text-[13px] text-muted">
        Your organization is created. Complete payment to unlock the workspace.
        Complimentary accounts are only provisioned by Platform Owners.
      </p>

      {error ? (
        <p className="mb-3 rounded-lg border border-[#fecaca] bg-[#fff5f5] px-3 py-2 text-[13px] text-bad">
          {error}
        </p>
      ) : null}

      <div className="mb-3 inline-flex rounded-lg border border-line p-0.5">
        <button
          type="button"
          onClick={() => setInterval("month")}
          className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold ${
            interval === "month"
              ? "bg-brand text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval("year")}
          className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold ${
            interval === "year"
              ? "bg-brand text-white"
              : "text-muted hover:text-ink"
          }`}
        >
          Annual
        </button>
      </div>

      <div className="mb-4 space-y-2">
        {SELF_SERVE.map((p) => {
          const price = interval === "year" ? p.yearlyPrice : p.monthlyPrice;
          const selected = plan === p.key;
          return (
            <label
              key={p.key}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${
                selected
                  ? "border-brand bg-[rgba(255,102,0,.04)]"
                  : "border-line bg-white hover:border-[#c3ccd9]"
              }`}
            >
              <input
                type="radio"
                className="mt-1"
                checked={selected}
                onChange={() => setPlan(p.key)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex justify-between gap-2">
                  <span className="text-[13.5px] font-bold">{p.label}</span>
                  <span className="text-[13px] font-semibold">
                    {formatMoney(price, interval)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[12px] text-muted">
                  {p.tagline}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await resumeOnboardingCheckout(
              plan as "starter" | "professional" | "agency",
              interval,
            );
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.location.assign(result.url);
          })
        }
        className="h-10 w-full rounded-lg bg-brand text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Opening checkout…" : "Continue to payment"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await switchToPaidOrganization();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.location.assign(result.href);
          })
        }
        className="mt-3 w-full text-center text-[13px] font-medium text-muted hover:text-ink disabled:opacity-60"
      >
        Back to my other organization
      </button>
    </>
  );
}
