"use client";

import type { BudgetBreakdown } from "@/lib/forms/smart-logic";
import { formatMoney } from "@/lib/forms/smart-logic";

/** Live estimate breakdown: services, add-ons, discount, tax, total. */
export function BudgetBreakdownView({
  budget,
  label = "Estimate",
}: {
  budget: BudgetBreakdown;
  label?: string;
}) {
  if (!budget.lines.length && budget.total <= 0) {
    return (
      <p className="text-[12px] text-faint">
        Select services or add-ons to see a live estimate.
      </p>
    );
  }

  return (
    <div
      className="rounded-[10px] border px-3 py-2.5"
      style={{
        borderColor: "var(--avx-input-border, #dbe1ea)",
        background: "var(--avx-upload-bg, #f8fafc)",
      }}
    >
      <p
        className="mb-2 text-[11px] font-semibold tracking-[0.08em] uppercase"
        style={{ color: "var(--avx-text-muted, #5b6b83)" }}
      >
        {label}
      </p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {budget.lines.map((line, i) => (
          <li
            key={`${line.kind}-${line.label}-${i}`}
            className="flex items-center justify-between gap-3 text-[12.5px]"
            style={{
              color:
                line.kind === "discount"
                  ? "#047857"
                  : "var(--avx-label, #13233c)",
              fontWeight: line.kind === "tax" || line.kind === "discount" ? 600 : 500,
            }}
          >
            <span>{line.label}</span>
            <span className="tabular-nums">
              {formatMoney(line.amount, budget.currency)}
            </span>
          </li>
        ))}
      </ul>
      <div
        className="mt-2 flex items-center justify-between gap-3 border-t pt-2 text-[13px] font-bold"
        style={{
          borderColor: "var(--avx-input-border, #dbe1ea)",
          color: "var(--avx-input-focus-border, #ff6600)",
        }}
      >
        <span>Total</span>
        <span className="tabular-nums">
          {formatMoney(budget.total, budget.currency)}
        </span>
      </div>
    </div>
  );
}
