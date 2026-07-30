"use client";

import Link from "next/link";
import { useState } from "react";
import { FormError } from "@/components/ui/field";
import { createAgency } from "@/lib/agency/create";
import { CATALOG_PLANS, formatMoney } from "@/lib/billing/catalog";

const SELF_SERVE = CATALOG_PLANS.filter((p) => !p.contactSales);

const INDUSTRIES = [
  "Digital agency",
  "Web design / development",
  "Marketing",
  "E-commerce",
  "SaaS",
  "Consulting",
  "Other",
];

const TEAM_SIZES = ["Just me", "2–5", "6–15", "16–50", "51+"];

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Bangladesh",
  "India",
  "Germany",
  "United Arab Emirates",
  "Other",
];

const input =
  "w-full rounded-lg border border-[#dbe1ea] bg-white px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand";
const labelCls = "mb-1.5 block text-left text-[12.5px] font-semibold text-ink";

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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">
          New organization
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          Tell us about your agency, pick a plan, then continue to secure
          payment
        </p>
      </header>

      <FormError message={error} />

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-2xl border border-line bg-white p-7 shadow-[0_6px_24px_rgba(11,30,58,.05)] sm:p-9">
          <div className="mb-6 text-center">
            <h2 className="text-[16px] font-bold text-ink">
              Organization details
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Used for billing, invoices, and your workspace profile
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Organization name</span>
              <input
                name="name"
                required
                autoFocus
                placeholder="Northwind Digital"
                className={input}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Website</span>
              <input
                name="website"
                type="url"
                placeholder="https://northwind.example"
                className={input}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Contact name</span>
              <input
                name="billingName"
                placeholder="Alex Morgan"
                className={input}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Billing email</span>
              <input
                name="billingEmail"
                type="email"
                placeholder="billing@northwind.example"
                className={input}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Phone</span>
              <input
                name="contactPhone"
                type="tel"
                placeholder="+1 555 0100"
                className={input}
              />
            </label>

            <label className="block">
              <span className={labelCls}>Country</span>
              <select
                name="country"
                defaultValue="United States"
                className={input}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelCls}>Industry</span>
              <select name="industry" defaultValue="" className={input}>
                <option value="" disabled>
                  Select industry
                </option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelCls}>Team size</span>
              <select name="teamSize" defaultValue="" className={input}>
                <option value="" disabled>
                  Select team size
                </option>
                {TEAM_SIZES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_6px_24px_rgba(11,30,58,.05)]">
          <div className="border-b border-[#edf0f5] bg-gradient-to-br from-[#fff8f3] via-white to-[#f0f7ff] px-7 py-7 text-center sm:px-9">
            <p className="text-[11px] font-bold tracking-[0.14em] text-brand uppercase">
              Pricing
            </p>
            <h2 className="mt-1.5 text-[20px] font-bold tracking-[-0.02em] text-ink">
              Choose your plan
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[13px] text-muted">
              Start where you are today — upgrade anytime from Billing
            </p>

            <div className="mt-5 inline-flex rounded-full border border-line bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setInterval("month")}
                className={`rounded-full px-5 py-2 text-[13px] font-semibold transition ${
                  interval === "month"
                    ? "bg-brand text-white shadow-[0_4px_12px_rgba(255,102,0,.3)]"
                    : "text-muted hover:text-ink"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setInterval("year")}
                className={`rounded-full px-5 py-2 text-[13px] font-semibold transition ${
                  interval === "year"
                    ? "bg-brand text-white shadow-[0_4px_12px_rgba(255,102,0,.3)]"
                    : "text-muted hover:text-ink"
                }`}
              >
                Annual
                <span className="ml-1.5 text-[11px] font-bold opacity-90">
                  Save ~17%
                </span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-7 sm:grid-cols-3 sm:p-9">
            {SELF_SERVE.map((p) => {
              const price =
                interval === "year" ? p.yearlyPrice : p.monthlyPrice;
              const selected = plan === p.key;
              const featured = p.key === "professional";
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPlan(p.key)}
                  className={`relative flex flex-col rounded-2xl border-2 px-5 py-6 text-center transition ${
                    selected
                      ? "border-brand bg-[rgba(255,102,0,.04)] shadow-[0_10px_28px_rgba(255,102,0,.16)]"
                      : featured
                        ? "border-[#ffd4b8] bg-[#fffaf6] hover:border-brand/50"
                        : "border-line bg-[#fcfdfe] hover:border-[#c3ccd9]"
                  }`}
                >
                  {featured ? (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                      Popular
                    </span>
                  ) : null}

                  <span
                    className={`mx-auto mb-3 grid size-5 place-items-center rounded-full border-2 ${
                      selected
                        ? "border-brand bg-brand"
                        : "border-[#c3ccd9] bg-white"
                    }`}
                  >
                    {selected ? (
                      <span className="size-1.5 rounded-full bg-white" />
                    ) : null}
                  </span>

                  <span className="text-[15px] font-bold text-ink">
                    {p.label}
                  </span>
                  <span className="mt-3 text-[28px] font-bold tracking-tight text-ink">
                    {formatMoney(price, interval)}
                  </span>
                  <span className="mt-1 text-[12px] text-faint">
                    {interval === "year" ? "billed yearly" : "per month"}
                  </span>
                  <span className="mt-4 text-[13px] leading-snug text-muted">
                    {p.tagline}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f5] pt-6">
          <Link
            href={"/organizations" as never}
            className="rounded-lg px-3 py-2.5 text-[13px] font-semibold text-muted hover:bg-[#f1f4f8] hover:text-ink"
          >
            ← Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="min-w-[220px] rounded-lg bg-brand px-5 py-3 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(255,102,0,.28)] transition hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Opening checkout…" : "Continue to payment →"}
          </button>
        </div>
      </form>
    </div>
  );
}
