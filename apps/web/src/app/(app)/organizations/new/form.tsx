"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import { createAgency } from "@/lib/agency/create";
import { CATALOG_PLANS, formatMoney } from "@/lib/billing/catalog";

const SELF_SERVE = CATALOG_PLANS.filter((p) => !p.contactSales);

/**
 * Self-serve org create form (Stripe checkout required).
 */
export function NewOrganizationForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [plan, setPlan] = useState("professional");
  const [interval, setInterval] = useState<"month" | "year">("month");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const data = new FormData(e.currentTarget);
      data.set("plan", plan);
      data.set("interval", interval);
      data.set(
        "successUrl",
        "/onboarding/billing?upgraded=1&next=/organizations",
      );
      data.set("cancelUrl", "/organizations");
      const created = await createAgency(data);
      if (!created.ok) {
        setError(created.error);
        setPending(false);
        return;
      }
      window.location.assign(created.checkoutUrl);
    } catch (err) {
      console.error("New organization submit failed", err);
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader
        title="New organization"
        subtitle="Select a plan and pay to activate — complimentary orgs are created by Platform Owners"
      />

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-line bg-white p-5"
      >
        <FormError message={error} />
        <Field
          label="Organization name"
          name="name"
          required
          autoFocus
          placeholder="Northwind Digital"
        />

        <div className="mb-4">
          <p className="mb-2 text-[12.5px] font-semibold text-muted">Plan</p>
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
                      : "border-line hover:border-[#c3ccd9]"
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
        </div>

        <div className="flex items-center gap-3">
          <div className="w-52">
            <SubmitButton pending={pending}>
              {pending ? "Opening checkout…" : "Continue to payment"}
            </SubmitButton>
          </div>
          <Link
            href={"/organizations" as never}
            className="text-[13px] font-medium text-muted hover:text-ink"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
