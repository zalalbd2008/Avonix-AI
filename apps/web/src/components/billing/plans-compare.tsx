"use client";

import { useState } from "react";
import {
  CATALOG_PLANS,
  PLAN_FEATURE_LABELS,
  formatMoney,
  type BillingInterval,
  type PlanFeatureKey,
} from "@/lib/billing/catalog";
import { UpgradeButton } from "@/components/billing-actions";
import { BillingIcon } from "@/components/billing/billing-icons";

const FEATURE_ORDER = Object.keys(PLAN_FEATURE_LABELS) as PlanFeatureKey[];

function cellValue(v: string | boolean) {
  if (v === true) return "✓";
  if (v === false) return "—";
  return v;
}

export function PlansCompare({
  currentPlan,
  billingReady,
}: {
  currentPlan: "starter" | "professional" | "agency" | "enterprise";
  billingReady: boolean;
}) {
  const [interval, setInterval] = useState<BillingInterval>("year");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex rounded-lg border border-[#e8edf5] p-0.5">
          <Toggle
            active={interval === "month"}
            onClick={() => setInterval("month")}
            label="Monthly"
          />
          <Toggle
            active={interval === "year"}
            onClick={() => setInterval("year")}
            label="Annual"
          />
        </div>
        {interval === "year" ? (
          <span className="text-[12.5px] font-medium text-ok">Save 20%</span>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {CATALOG_PLANS.map((plan) => {
          const price =
            interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
          const isCurrent = plan.agencyPlan === currentPlan;
          const canCheckout = !plan.contactSales;

          return (
            <div
              key={plan.key}
              className={`flex flex-col rounded-xl border p-4 ${
                plan.highlighted
                  ? "border-brand"
                  : "border-[#e8edf5]"
              }`}
            >
              <div className="mb-3 grid size-9 place-items-center rounded-lg bg-[#f1f5f9] text-muted">
                <BillingIcon name="plan" className="size-4" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-ink">{plan.label}</h3>
                {isCurrent ? (
                  <span className="text-[11px] font-semibold text-brand">
                    Current
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-muted">{plan.tagline}</p>
              <p className="mt-3 text-[22px] font-bold text-ink">
                {formatMoney(price, interval === "year" ? "year" : "month")}
              </p>
              <div className="mt-3 flex-1 space-y-1 text-[12.5px] text-muted">
                {(
                  ["workspaces", "websites", "users", "aiCredits"] as PlanFeatureKey[]
                ).map((k) => (
                  <p key={k}>
                    <span className="font-medium text-ink">
                      {cellValue(plan.features[k])}
                    </span>{" "}
                    {PLAN_FEATURE_LABELS[k].replace(" limit", "").toLowerCase()}
                  </p>
                ))}
              </div>
              <div className="mt-4">
                {isCurrent ? (
                  <div className="rounded-lg bg-[#f1f5f9] py-2 text-center text-[13px] font-semibold text-muted">
                    Your plan
                  </div>
                ) : plan.contactSales ? (
                  <a
                    href="mailto:hello@avonix.ai?subject=Enterprise%20plan"
                    className="flex w-full items-center justify-center rounded-lg border border-[#e8edf5] py-2 text-[13px] font-semibold text-ink hover:border-brand hover:text-brand"
                  >
                    Contact sales
                  </a>
                ) : canCheckout ? (
                  <UpgradeButton
                    plan={plan.agencyPlan}
                    label={`Choose ${plan.label}`}
                    disabled={!billingReady}
                    interval={interval}
                  />
                ) : (
                  <div className="rounded-lg bg-[#f1f5f9] py-2 text-center text-[12.5px] text-faint">
                    Included on paid plans
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e8edf5]">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[#e8edf5]">
              <th className="px-4 py-2.5 text-[12px] font-medium text-muted">
                Feature
              </th>
              {CATALOG_PLANS.map((p) => (
                <th
                  key={p.key}
                  className="px-4 py-2.5 text-[12px] font-medium text-ink"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_ORDER.map((feat) => (
              <tr key={feat} className="border-b border-[#f1f5f9] last:border-0">
                <td className="px-4 py-2.5 text-muted">
                  {PLAN_FEATURE_LABELS[feat]}
                </td>
                {CATALOG_PLANS.map((p) => (
                  <td key={p.key} className="px-4 py-2.5 font-medium text-ink">
                    {cellValue(p.features[feat])}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="px-4 py-2.5 text-muted">
                {interval === "year" ? "Annual price" : "Monthly price"}
              </td>
              {CATALOG_PLANS.map((p) => {
                const price =
                  interval === "year" ? p.yearlyPrice : p.monthlyPrice;
                return (
                  <td key={p.key} className="px-4 py-2.5 font-semibold text-ink">
                    {formatMoney(price, interval)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Toggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold ${
        active ? "bg-brand text-white" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
