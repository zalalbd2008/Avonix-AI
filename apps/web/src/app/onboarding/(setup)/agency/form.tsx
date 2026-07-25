"use client";

import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createAgency } from "@/lib/agency/create";
import { CATALOG_PLANS, formatMoney } from "@/lib/billing/catalog";

const SELF_SERVE = CATALOG_PLANS.filter((p) => !p.contactSales);

export function CreateAgencyForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [plan, setPlan] = useState("professional");
  const [interval, setInterval] = useState<"month" | "year">("month");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    const data = new FormData(e.currentTarget);
    data.set("plan", plan);
    data.set("interval", interval);
    setPending(true);
    setError(null);

    try {
      const result = await createAgency(data);
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        // Org may exist without payment — finish checkout.
        if (result.error.toLowerCase().includes("billing") ||
            result.error.toLowerCase().includes("price") ||
            result.error.toLowerCase().includes("checkout")) {
          window.location.assign("/onboarding/billing");
          return;
        }
        return;
      }

      window.location.assign(result.checkoutUrl);
    } catch (err) {
      console.error("Create agency submit failed", err);
      setError("Something went wrong. Try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-[19px] font-bold tracking-tight">
        Create your organization
      </h1>
      <p className="mt-0.5 mb-4.5 text-[13px] text-muted">
        Choose a plan and complete payment to activate your account. Platform
        Owners can grant complimentary access separately.
      </p>
      <form onSubmit={onSubmit}>
        <FormError message={error} />
        <Field
          label="Organization name"
          name="name"
          required
          placeholder="Northwind Digital"
          autoFocus
        />

        <div className="mb-4">
          <p className="mb-2 text-[12.5px] font-semibold text-muted">Billing</p>
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

          <div className="space-y-2">
            {SELF_SERVE.map((p) => {
              const price =
                interval === "year" ? p.yearlyPrice : p.monthlyPrice;
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
                    name="plan_ui"
                    className="mt-1"
                    checked={selected}
                    onChange={() => setPlan(p.key)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-bold text-ink">
                        {p.label}
                      </span>
                      <span className="text-[13px] font-semibold text-ink">
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
          <p className="mt-2 text-[12px] text-faint">
            Need Enterprise?{" "}
            <a
              href="mailto:hello@avonix.ai?subject=Enterprise%20plan"
              className="font-medium text-brand hover:underline"
            >
              Contact sales
            </a>
          </p>
        </div>

        <SubmitButton pending={pending}>
          {pending ? "Redirecting to checkout…" : "Continue to payment"}
        </SubmitButton>
      </form>
    </>
  );
}
