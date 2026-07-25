import type {
  FormBudgetDiscount,
  FormCondition,
  FormConditionOp,
  FormField,
  FormLogicConfig,
  FormPricingConfig,
  FormPricingRule,
  FormScoreConfig,
  FormSkipRule,
  FormStep,
} from "@/lib/db/schema";
import { resolveOptionItems } from "./choice-config";
import { normalizeDiscounts } from "./budget";

export const CONDITION_OPS: { op: FormConditionOp; label: string }[] = [
  { op: "eq", label: "equals" },
  { op: "neq", label: "does not equal" },
  { op: "contains", label: "contains" },
  { op: "empty", label: "is empty" },
  { op: "filled", label: "is filled" },
  { op: "gt", label: "greater than" },
  { op: "gte", label: "greater or equal" },
  { op: "lt", label: "less than" },
  { op: "lte", label: "less or equal" },
];

/** Evaluate a show/hide or confirmation condition against current values. */
export function conditionMatches(
  condition: FormCondition | undefined | null,
  values: Record<string, string>,
): boolean {
  const c = condition;
  if (!c?.fieldKey) return true;

  const raw = values[c.fieldKey] ?? "";
  const filled = raw.trim().length > 0;
  const target = c.value ?? "";
  const num = Number(raw);
  const targetNum = Number(target);

  switch (c.op) {
    case "empty":
      return !filled;
    case "filled":
      return filled;
    case "eq":
      return raw === target;
    case "neq":
      return raw !== target;
    case "contains":
      return raw.toLowerCase().includes(target.toLowerCase());
    case "gt":
      return !Number.isNaN(num) && !Number.isNaN(targetNum) && num > targetNum;
    case "gte":
      return !Number.isNaN(num) && !Number.isNaN(targetNum) && num >= targetNum;
    case "lt":
      return !Number.isNaN(num) && !Number.isNaN(targetNum) && num < targetNum;
    case "lte":
      return !Number.isNaN(num) && !Number.isNaN(targetNum) && num <= targetNum;
    default:
      return true;
  }
}

export const DEFAULT_LOGIC: FormLogicConfig = {
  skipRules: [],
  score: { enabled: false, showLive: true, label: "Score" },
  pricing: {
    enabled: false,
    currency: "USD",
    baseAmount: 0,
    showLive: true,
    label: "Estimate",
    rules: [],
  },
};

export function normalizeLogic(
  raw?: FormLogicConfig | null,
): FormLogicConfig {
  const score = normalizeScore(raw?.score);
  const pricing = normalizePricing(raw?.pricing);
  const skipRules = normalizeSkipRules(raw?.skipRules);
  return {
    ...(skipRules.length ? { skipRules } : {}),
    ...(score ? { score } : {}),
    ...(pricing ? { pricing } : {}),
  };
}

function normalizeScore(raw?: FormScoreConfig | null): FormScoreConfig | undefined {
  if (!raw?.enabled) return undefined;
  return {
    enabled: true,
    showLive: raw.showLive !== false,
    ...(raw.label?.trim()
      ? { label: raw.label.trim().slice(0, 40) }
      : { label: "Score" }),
  };
}

function normalizePricing(
  raw?: FormPricingConfig | null,
): FormPricingConfig | undefined {
  if (!raw?.enabled) return undefined;
  const rules = (raw.rules ?? [])
    .map(normalizePricingRule)
    .filter((r): r is FormPricingRule => Boolean(r))
    .slice(0, 20);
  const serviceFieldKeys = normalizeKeyList(raw.serviceFieldKeys);
  const addonFieldKeys = normalizeKeyList(raw.addonFieldKeys);
  const currencies = normalizeCurrencies(raw.currencies);
  const discounts = normalizeDiscounts(raw.discounts);
  return {
    enabled: true,
    currency: (raw.currency?.trim() || "USD").toUpperCase().slice(0, 8),
    baseAmount: clampMoney(raw.baseAmount ?? 0),
    showLive: raw.showLive !== false,
    label: (raw.label?.trim() || "Estimate").slice(0, 40),
    ...(rules.length ? { rules } : {}),
    ...(serviceFieldKeys.length ? { serviceFieldKeys } : {}),
    ...(addonFieldKeys.length ? { addonFieldKeys } : {}),
    ...(raw.currencyFieldKey?.trim()
      ? { currencyFieldKey: raw.currencyFieldKey.trim().toLowerCase().slice(0, 64) }
      : {}),
    ...(currencies.length ? { currencies } : {}),
    ...(raw.discountFieldKey?.trim()
      ? { discountFieldKey: raw.discountFieldKey.trim().toLowerCase().slice(0, 64) }
      : {}),
    ...(discounts.length ? { discounts } : {}),
    ...(typeof raw.taxPercent === "number" && raw.taxPercent > 0
      ? { taxPercent: Math.min(100, Math.max(0, Math.round(raw.taxPercent * 100) / 100)) }
      : {}),
    ...(raw.taxLabel?.trim()
      ? { taxLabel: raw.taxLabel.trim().slice(0, 40) }
      : {}),
  };
}

function normalizeKeyList(raw?: string[]): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of raw) {
    const key = k?.trim().toLowerCase().slice(0, 64);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 20) break;
  }
  return out;
}

function normalizeCurrencies(raw?: string[]): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    const cur = c?.trim().toUpperCase().slice(0, 8);
    if (!cur || !/^[A-Z]{3}$/.test(cur) || seen.has(cur)) continue;
    seen.add(cur);
    out.push(cur);
    if (out.length >= 12) break;
  }
  return out;
}

function normalizePricingRule(
  raw: FormPricingRule | null | undefined,
): FormPricingRule | null {
  if (!raw?.id || !raw.fieldKey?.trim()) return null;
  const rule: FormPricingRule = {
    id: raw.id.trim().slice(0, 40),
    fieldKey: raw.fieldKey.trim().toLowerCase().slice(0, 64),
  };
  if (raw.condition?.fieldKey) {
    rule.condition = {
      fieldKey: raw.condition.fieldKey.trim().toLowerCase(),
      op: raw.condition.op,
      value: raw.condition.value,
    };
  }
  if (typeof raw.amount === "number" && !Number.isNaN(raw.amount)) {
    rule.amount = clampMoney(raw.amount);
  }
  if (raw.label?.trim()) rule.label = raw.label.trim().slice(0, 60);
  return rule;
}

function normalizeSkipRules(
  raw?: FormSkipRule[] | null,
): FormSkipRule[] {
  if (!raw?.length) return [];
  return raw
    .filter(
      (r) =>
        r?.id &&
        r.gotoStepId?.trim() &&
        r.condition?.fieldKey?.trim(),
    )
    .map((r) => ({
      id: r.id.trim().slice(0, 40),
      gotoStepId: r.gotoStepId.trim().slice(0, 40),
      condition: {
        fieldKey: r.condition.fieldKey.trim().toLowerCase(),
        op: r.condition.op,
        value: r.condition.value,
      },
    }))
    .slice(0, 20);
}

function clampMoney(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(1_000_000, Math.max(0, Math.round(n * 100) / 100));
}

/** Required when visible: static required OR requiredWhen matches. */
export function fieldIsRequired(
  field: FormField,
  values: Record<string, string>,
): boolean {
  if (field.type === "section" || field.type === "hidden" || field.type === "recaptcha") {
    return false;
  }
  if (field.requiredWhen?.fieldKey) {
    return conditionMatches(field.requiredWhen, values);
  }
  return Boolean(field.required);
}

/** Sum option scores for selected values. */
export function computeScore(
  fields: FormField[],
  values: Record<string, string>,
): number {
  let total = 0;
  for (const f of fields) {
    if (f.type === "section" || f.type === "hidden") continue;
    const items = resolveOptionItems(f);
    if (!items.some((o) => typeof o.score === "number")) continue;
    const raw = values[f.key] ?? "";
    const selected = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const v of selected) {
      const item = items.find((o) => o.value === v);
      if (item && typeof item.score === "number") total += item.score;
    }
    // rating / number as direct score when no option map
    if (
      !items.length &&
      (f.type === "rating" || f.type === "number" || f.type === "range")
    ) {
      const n = Number(raw);
      if (!Number.isNaN(n)) total += n;
    }
  }
  return Math.round(total * 100) / 100;
}

export type BudgetLine = {
  label: string;
  amount: number;
  kind: "base" | "service" | "addon" | "rule" | "discount" | "tax";
};

export type BudgetBreakdown = {
  currency: string;
  base: number;
  services: number;
  addons: number;
  rules: number;
  subtotal: number;
  discount: number;
  discountLabel?: string;
  tax: number;
  taxLabel: string;
  total: number;
  lines: BudgetLine[];
};

const EMPTY_BUDGET: BudgetBreakdown = {
  currency: "USD",
  base: 0,
  services: 0,
  addons: 0,
  rules: 0,
  subtotal: 0,
  discount: 0,
  tax: 0,
  taxLabel: "Tax",
  total: 0,
  lines: [],
};

/** Full budget: services, add-ons, rules, discount codes, tax, currency. */
export function computeBudget(
  logic: FormLogicConfig | undefined | null,
  fields: FormField[],
  values: Record<string, string>,
): BudgetBreakdown {
  const pricing = logic?.pricing;
  if (!pricing?.enabled) return { ...EMPTY_BUDGET, lines: [] };

  const currency = resolveBudgetCurrency(pricing, values);
  const serviceKeys = new Set(
    (pricing.serviceFieldKeys ?? []).map((k) => k.toLowerCase()),
  );
  const addonKeys = new Set(
    (pricing.addonFieldKeys ?? []).map((k) => k.toLowerCase()),
  );
  const splitMode = serviceKeys.size > 0 || addonKeys.size > 0;

  const base = clampMoney(pricing.baseAmount ?? 0);
  let services = 0;
  let addons = 0;
  let rulesTotal = 0;
  const lines: BudgetLine[] = [];
  const counted = new Set<string>();

  if (base > 0) {
    lines.push({ label: "Base", amount: base, kind: "base" });
  }

  for (const f of fields) {
    const items = resolveOptionItems(f);
    if (!items.some((o) => typeof o.amount === "number")) continue;
    const fieldTotal = sumOptionAmounts(f, values[f.key] ?? "");
    if (fieldTotal <= 0) continue;
    counted.add(f.key);

    const kind: BudgetLine["kind"] =
      splitMode && addonKeys.has(f.key) ? "addon" : "service";
    if (kind === "addon") addons += fieldTotal;
    else services += fieldTotal;

    lines.push({
      label: f.label || f.key,
      amount: fieldTotal,
      kind,
    });
  }

  for (const rule of pricing.rules ?? []) {
    if (rule.condition?.fieldKey && !conditionMatches(rule.condition, values)) {
      continue;
    }
    if (typeof rule.amount === "number") {
      const amt = clampMoney(rule.amount);
      if (amt <= 0) continue;
      rulesTotal += amt;
      lines.push({
        label: rule.label || "Add-on",
        amount: amt,
        kind: "rule",
      });
      continue;
    }
    if (counted.has(rule.fieldKey)) continue;
    const f = fields.find((x) => x.key === rule.fieldKey);
    if (!f) continue;
    const fieldTotal = sumOptionAmounts(f, values[rule.fieldKey] ?? "");
    if (fieldTotal <= 0) continue;
    rulesTotal += fieldTotal;
    lines.push({
      label: rule.label || f.label || f.key,
      amount: fieldTotal,
      kind: "rule",
    });
  }

  const subtotal = clampMoney(base + services + addons + rulesTotal);
  const discountMatch = matchBudgetDiscount(pricing, values);
  let discount = 0;
  let discountLabel: string | undefined;
  if (discountMatch) {
    discount =
      discountMatch.type === "percent"
        ? clampMoney((subtotal * discountMatch.value) / 100)
        : clampMoney(discountMatch.value);
    discount = Math.min(discount, subtotal);
    discountLabel =
      discountMatch.label ||
      (discountMatch.type === "percent"
        ? `${discountMatch.value}% off`
        : "Discount");
    if (discount > 0) {
      lines.push({
        label: discountLabel,
        amount: -discount,
        kind: "discount",
      });
    }
  }

  const taxable = clampMoney(subtotal - discount);
  const taxPercent =
    typeof pricing.taxPercent === "number" && !Number.isNaN(pricing.taxPercent)
      ? Math.min(100, Math.max(0, pricing.taxPercent))
      : 0;
  const tax = taxPercent > 0 ? clampMoney((taxable * taxPercent) / 100) : 0;
  const taxLabel = (pricing.taxLabel?.trim() || "Tax").slice(0, 40);
  if (tax > 0) {
    lines.push({
      label: `${taxLabel} (${taxPercent}%)`,
      amount: tax,
      kind: "tax",
    });
  }

  return {
    currency,
    base,
    services,
    addons,
    rules: rulesTotal,
    subtotal,
    discount,
    discountLabel,
    tax,
    taxLabel,
    total: clampMoney(taxable + tax),
    lines,
  };
}

function sumOptionAmounts(field: FormField, raw: string): number {
  const items = resolveOptionItems(field);
  let total = 0;
  for (const v of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const item = items.find((o) => o.value === v);
    if (item && typeof item.amount === "number") {
      total += clampMoney(item.amount);
    }
  }
  return total;
}

function resolveBudgetCurrency(
  pricing: FormPricingConfig,
  values: Record<string, string>,
): string {
  const fromField = pricing.currencyFieldKey
    ? (values[pricing.currencyFieldKey] ?? "").trim().toUpperCase()
    : "";
  if (fromField && /^[A-Z]{3}$/.test(fromField)) return fromField;
  const fallback = (pricing.currency?.trim() || "USD").toUpperCase().slice(0, 8);
  return /^[A-Z]{3}$/.test(fallback) ? fallback : "USD";
}

function matchBudgetDiscount(
  pricing: FormPricingConfig,
  values: Record<string, string>,
): FormBudgetDiscount | null {
  const key = pricing.discountFieldKey?.trim();
  if (!key || !pricing.discounts?.length) return null;
  const code = (values[key] ?? "").trim().toUpperCase();
  if (!code) return null;
  return (
    pricing.discounts.find((d) => d.code.trim().toUpperCase() === code) ?? null
  );
}

/** Live total — uses full budget calculator when pricing is enabled. */
export function computePrice(
  logic: FormLogicConfig | undefined | null,
  fields: FormField[],
  values: Record<string, string>,
): number {
  return computeBudget(logic, fields, values).total;
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Resolve the next step index after Continue.
 * First matching skip rule wins; otherwise current + 1.
 */
export function resolveNextStepIndex(
  currentIndex: number,
  steps: FormStep[],
  skipRules: FormSkipRule[] | undefined,
  values: Record<string, string>,
): number {
  if (!steps.length) return 0;
  const current = steps[currentIndex];
  if (!current) return Math.min(currentIndex + 1, steps.length - 1);

  for (const rule of skipRules ?? []) {
    if (!conditionMatches(rule.condition, values)) continue;
    const idx = steps.findIndex((s) => s.id === rule.gotoStepId);
    if (idx >= 0 && idx !== currentIndex) return idx;
  }
  return Math.min(currentIndex + 1, steps.length - 1);
}

export function normalizeCondition(
  raw?: FormCondition | null,
): FormCondition | undefined {
  if (!raw?.fieldKey?.trim()) return undefined;
  const op = CONDITION_OPS.some((o) => o.op === raw.op) ? raw.op : "eq";
  return {
    fieldKey: raw.fieldKey.trim().toLowerCase(),
    op,
    ...(op !== "empty" && op !== "filled"
      ? { value: raw.value ?? "" }
      : {}),
  };
}

export function newLogicId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}
