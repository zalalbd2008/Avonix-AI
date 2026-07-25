import type { FormBudgetDiscount } from "@/lib/db/schema";

export const BUDGET_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "INR",
  "BDT",
  "JPY",
];

function clampMoney(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(1_000_000, Math.max(0, Math.round(n * 100) / 100));
}

export function normalizeDiscounts(
  raw?: FormBudgetDiscount[] | null,
): FormBudgetDiscount[] {
  if (!Array.isArray(raw)) return [];
  const out: FormBudgetDiscount[] = [];
  const seen = new Set<string>();
  for (const d of raw) {
    const code = d?.code?.trim().toUpperCase().slice(0, 40);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const type = d.type === "fixed" ? ("fixed" as const) : ("percent" as const);
    const value =
      type === "percent"
        ? Math.min(100, Math.max(0, Number(d.value) || 0))
        : clampMoney(Number(d.value) || 0);
    if (value <= 0) continue;
    out.push({
      code,
      type,
      value,
      ...(d.label?.trim() ? { label: d.label.trim().slice(0, 60) } : {}),
    });
    if (out.length >= 20) break;
  }
  return out;
}
