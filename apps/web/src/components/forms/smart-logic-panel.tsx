"use client";

import type {
  FormBudgetDiscount,
  FormCondition,
  FormConditionOp,
  FormField,
  FormLogicConfig,
  FormPricingRule,
  FormSkipRule,
  FormStep,
} from "@/lib/db/schema";
import { BudgetBreakdownView } from "@/components/forms/budget-breakdown";
import { BUDGET_CURRENCIES } from "@/lib/forms/budget";
import { resolveOptionItems, syncFieldOptions } from "@/lib/forms/choice-config";
import {
  CONDITION_OPS,
  DEFAULT_LOGIC,
  computeBudget,
  computeScore,
  newLogicId,
  normalizeCondition,
  normalizeLogic,
} from "@/lib/forms/smart-logic";

/**
 * Smart Logic editors: skip rules, score, pricing, dynamic required, option scores.
 */
export function SmartLogicPanel({
  field,
  fields,
  steps,
  logic,
  values,
  onPatchField,
  onChangeLogic,
}: {
  field: FormField | null;
  fields: FormField[];
  steps: FormStep[];
  logic: FormLogicConfig;
  values: Record<string, string>;
  onPatchField: (key: string, partial: Partial<FormField>) => void;
  onChangeLogic: (next: FormLogicConfig) => void;
}) {
  const sources = fields.filter(
    (f) =>
      f.type !== "section" &&
      f.type !== "hidden" &&
      f.type !== "recaptcha" &&
      (!field || f.key !== field.key),
  );
  const cfg = { ...DEFAULT_LOGIC, ...logic };
  const liveScore = computeScore(fields, values);
  const liveBudget = computeBudget(cfg, fields, values);
  const choiceFields = fields.filter(
    (f) =>
      f.type === "select" ||
      f.type === "radio" ||
      f.type === "multiselect",
  );

  function setLogic(partial: Partial<FormLogicConfig>) {
    onChangeLogic(normalizeLogic({ ...cfg, ...partial }));
  }

  return (
    <div className="flex flex-col gap-4">
      {(cfg.score?.enabled || cfg.pricing?.enabled) && (
        <div className="flex flex-col gap-2">
          {cfg.score?.enabled ? (
            <div className="rounded-xl border border-[#edf0f5] bg-[#fff8f3] px-3 py-2.5 text-[12.5px] font-semibold text-ink">
              {cfg.score.label || "Score"}: {liveScore}
            </div>
          ) : null}
          {cfg.pricing?.enabled ? (
            <BudgetBreakdownView
              budget={liveBudget}
              label={cfg.pricing.label || "Estimate"}
            />
          ) : null}
        </div>
      )}

      {field ? (
        <>
          <ConditionEditor
            title="Show / hide"
            hint={`Show “${field.label || field.key}” only when…`}
            condition={field.condition}
            sources={sources}
            onChange={(condition) =>
              onPatchField(field.key, { condition })
            }
          />
          {field.type !== "section" &&
            field.type !== "hidden" &&
            field.type !== "recaptcha" && (
              <ConditionEditor
                title="Dynamic required"
                hint="Require this field only when…"
                condition={field.requiredWhen}
                sources={sources}
                allowAlwaysLabel="Use static Required flag"
                onChange={(requiredWhen) =>
                  onPatchField(field.key, { requiredWhen })
                }
              />
            )}
          {(field.type === "select" ||
            field.type === "radio" ||
            field.type === "multiselect") && (
            <OptionScoreAmountEditor
              field={field}
              onChange={(partial) => onPatchField(field.key, partial)}
            />
          )}
        </>
      ) : (
        <p className="rounded-lg bg-[#f8fafc] px-3 py-2.5 text-[12.5px] text-faint">
          Select a field on the canvas to edit show/hide, dynamic required, and
          option scores.
        </p>
      )}

      <div className="border-t border-[#f1f4f8] pt-3.5">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Skip logic
        </p>
        <p className="mb-2 text-[12px] leading-relaxed text-muted">
          On Continue, jump to another step when a rule matches.
        </p>
        <div className="flex flex-col gap-2">
          {(cfg.skipRules ?? []).map((rule) => (
            <SkipRuleRow
              key={rule.id}
              rule={rule}
              sources={fields.filter(
                (f) =>
                  f.type !== "section" &&
                  f.type !== "hidden" &&
                  f.type !== "recaptcha",
              )}
              steps={steps}
              onChange={(next) =>
                setLogic({
                  skipRules: (cfg.skipRules ?? []).map((r) =>
                    r.id === rule.id ? next : r,
                  ),
                })
              }
              onRemove={() =>
                setLogic({
                  skipRules: (cfg.skipRules ?? []).filter((r) => r.id !== rule.id),
                })
              }
            />
          ))}
          <button
            type="button"
            onClick={() => {
              const first = sources[0];
              const target = steps[1] ?? steps[0];
              if (!first || !target) return;
              const rule: FormSkipRule = {
                id: newLogicId("skip"),
                gotoStepId: target.id,
                condition: { fieldKey: first.key, op: "eq", value: "" },
              };
              setLogic({ skipRules: [...(cfg.skipRules ?? []), rule] });
            }}
            className="rounded-lg border border-dashed border-[#dbe1ea] px-2 py-2 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            + Add skip rule
          </button>
        </div>
      </div>

      <div className="border-t border-[#f1f4f8] pt-3.5">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Score
        </p>
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(cfg.score?.enabled)}
            onChange={(e) =>
              setLogic({
                score: e.target.checked
                  ? { enabled: true, showLive: true, label: "Score" }
                  : { enabled: false },
              })
            }
          />
          Enable score-based questions
        </label>
        {cfg.score?.enabled ? (
          <div className="flex flex-col gap-2">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Label
              </span>
              <input
                value={cfg.score.label ?? "Score"}
                onChange={(e) =>
                  setLogic({
                    score: { ...cfg.score, enabled: true, label: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={cfg.score.showLive !== false}
                onChange={(e) =>
                  setLogic({
                    score: {
                      ...cfg.score,
                      enabled: true,
                      showLive: e.target.checked,
                    },
                  })
                }
              />
              Show live score on form
            </label>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#f1f4f8] pt-3.5">
        <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Budget calculator
        </p>
        <p className="mb-2 text-[12px] leading-relaxed text-muted">
          Live estimate from service &amp; add-on amounts, currency, discount
          codes, and tax.
        </p>
        <label className="mb-2 flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(cfg.pricing?.enabled)}
            onChange={(e) =>
              setLogic({
                pricing: e.target.checked
                  ? {
                      enabled: true,
                      currency: "USD",
                      baseAmount: 0,
                      showLive: true,
                      label: "Estimate",
                      rules: [],
                      taxPercent: 0,
                      discounts: [
                        {
                          code: "SAVE10",
                          type: "percent",
                          value: 10,
                          label: "10% off",
                        },
                      ],
                    }
                  : { enabled: false },
              })
            }
          />
          Enable budget calculator
        </label>
        {cfg.pricing?.enabled ? (
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                  Default currency
                </span>
                <select
                  value={cfg.pricing.currency ?? "USD"}
                  onChange={(e) =>
                    setLogic({
                      pricing: {
                        ...cfg.pricing,
                        enabled: true,
                        currency: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                >
                  {BUDGET_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                  Base amount
                </span>
                <input
                  type="number"
                  min={0}
                  value={cfg.pricing.baseAmount ?? 0}
                  onChange={(e) =>
                    setLogic({
                      pricing: {
                        ...cfg.pricing,
                        enabled: true,
                        baseAmount: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                />
              </label>
            </div>

            <FieldKeyMulti
              title="Service fields"
              hint="Option amounts count as services"
              fields={choiceFields}
              selected={cfg.pricing.serviceFieldKeys ?? []}
              onChange={(serviceFieldKeys) =>
                setLogic({
                  pricing: { ...cfg.pricing, enabled: true, serviceFieldKeys },
                })
              }
            />
            <FieldKeyMulti
              title="Add-on fields"
              hint="Option amounts count as add-ons"
              fields={choiceFields}
              selected={cfg.pricing.addonFieldKeys ?? []}
              onChange={(addonFieldKeys) =>
                setLogic({
                  pricing: { ...cfg.pricing, enabled: true, addonFieldKeys },
                })
              }
            />

            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Currency field (optional)
              </span>
              <select
                value={cfg.pricing.currencyFieldKey ?? ""}
                onChange={(e) =>
                  setLogic({
                    pricing: {
                      ...cfg.pricing,
                      enabled: true,
                      currencyFieldKey: e.target.value || undefined,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                <option value="">Use default currency</option>
                {fields
                  .filter((f) => f.type === "select" || f.type === "text")
                  .map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label || f.key}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Discount code field
              </span>
              <select
                value={cfg.pricing.discountFieldKey ?? ""}
                onChange={(e) =>
                  setLogic({
                    pricing: {
                      ...cfg.pricing,
                      enabled: true,
                      discountFieldKey: e.target.value || undefined,
                    },
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                <option value="">None</option>
                {fields
                  .filter((f) => f.type === "text")
                  .map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label || f.key}
                    </option>
                  ))}
              </select>
            </label>

            <div className="rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-2.5">
              <p className="mb-2 text-[11px] font-semibold text-muted">
                Discount codes
              </p>
              {(cfg.pricing.discounts ?? []).map((d, i) => (
                <DiscountRow
                  key={`${d.code}-${i}`}
                  discount={d}
                  onChange={(next) => {
                    const discounts = [...(cfg.pricing?.discounts ?? [])];
                    discounts[i] = next;
                    setLogic({
                      pricing: { ...cfg.pricing, enabled: true, discounts },
                    });
                  }}
                  onRemove={() =>
                    setLogic({
                      pricing: {
                        ...cfg.pricing,
                        enabled: true,
                        discounts: (cfg.pricing?.discounts ?? []).filter(
                          (_, j) => j !== i,
                        ),
                      },
                    })
                  }
                />
              ))}
              <button
                type="button"
                onClick={() =>
                  setLogic({
                    pricing: {
                      ...cfg.pricing,
                      enabled: true,
                      discounts: [
                        ...(cfg.pricing?.discounts ?? []),
                        {
                          code: "SAVE10",
                          type: "percent",
                          value: 10,
                          label: "10% off",
                        },
                      ],
                    },
                  })
                }
                className="mt-1 w-full rounded-lg border border-dashed border-[#dbe1ea] px-2 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
              >
                + Add discount code
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                  Tax %
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={cfg.pricing.taxPercent ?? 0}
                  onChange={(e) =>
                    setLogic({
                      pricing: {
                        ...cfg.pricing,
                        enabled: true,
                        taxPercent: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                  Tax label
                </span>
                <input
                  value={cfg.pricing.taxLabel ?? "Tax"}
                  onChange={(e) =>
                    setLogic({
                      pricing: {
                        ...cfg.pricing,
                        enabled: true,
                        taxLabel: e.target.value,
                      },
                    })
                  }
                  className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={cfg.pricing.showLive !== false}
                onChange={(e) =>
                  setLogic({
                    pricing: {
                      ...cfg.pricing,
                      enabled: true,
                      showLive: e.target.checked,
                    },
                  })
                }
              />
              Show live estimate on form
            </label>

            {(cfg.pricing.rules ?? []).map((rule) => (
              <PricingRuleRow
                key={rule.id}
                rule={rule}
                fields={choiceFields}
                sources={sources}
                onChange={(next) =>
                  setLogic({
                    pricing: {
                      ...cfg.pricing,
                      enabled: true,
                      rules: (cfg.pricing?.rules ?? []).map((r) =>
                        r.id === rule.id ? next : r,
                      ),
                    },
                  })
                }
                onRemove={() =>
                  setLogic({
                    pricing: {
                      ...cfg.pricing,
                      enabled: true,
                      rules: (cfg.pricing?.rules ?? []).filter(
                        (r) => r.id !== rule.id,
                      ),
                    },
                  })
                }
              />
            ))}
            <button
              type="button"
              onClick={() => {
                const f = choiceFields[0] ?? sources[0];
                if (!f) return;
                const rule: FormPricingRule = {
                  id: newLogicId("price"),
                  fieldKey: f.key,
                  amount: 0,
                  label: "Add-on",
                };
                setLogic({
                  pricing: {
                    ...cfg.pricing,
                    enabled: true,
                    rules: [...(cfg.pricing?.rules ?? []), rule],
                  },
                });
              }}
              className="rounded-lg border border-dashed border-[#dbe1ea] px-2 py-2 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
            >
              + Add flat pricing rule
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FieldKeyMulti({
  title,
  hint,
  fields,
  selected,
  onChange,
}: {
  title: string;
  hint: string;
  fields: FormField[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (!fields.length) {
    return (
      <p className="text-[12px] text-faint">
        {title}: add select / radio / multi-select fields with option amounts.
      </p>
    );
  }
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-semibold text-muted">{title}</p>
      <p className="mb-1.5 text-[11px] text-faint">{hint}</p>
      <div className="flex flex-wrap gap-1.5">
        {fields.map((f) => {
          const on = selected.includes(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() =>
                onChange(
                  on
                    ? selected.filter((k) => k !== f.key)
                    : [...selected, f.key],
                )
              }
              className={[
                "rounded-md border px-2 py-1 text-[11px] font-semibold",
                on
                  ? "border-brand bg-[#fff8f3] text-brand"
                  : "border-[#dbe1ea] text-muted",
              ].join(" ")}
            >
              {f.label || f.key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DiscountRow({
  discount,
  onChange,
  onRemove,
}: {
  discount: FormBudgetDiscount;
  onChange: (next: FormBudgetDiscount) => void;
  onRemove: () => void;
}) {
  return (
    <div className="mb-1.5 grid grid-cols-[1fr_auto_4.5rem_auto] items-center gap-1.5">
      <input
        value={discount.code}
        onChange={(e) =>
          onChange({ ...discount, code: e.target.value.toUpperCase() })
        }
        placeholder="CODE"
        className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1.5 font-mono text-[12px] outline-none focus:border-brand"
      />
      <select
        value={discount.type}
        onChange={(e) =>
          onChange({
            ...discount,
            type: e.target.value === "fixed" ? "fixed" : "percent",
          })
        }
        className="rounded-md border border-[#dbe1ea] bg-white px-1.5 py-1.5 text-[12px]"
      >
        <option value="percent">%</option>
        <option value="fixed">$</option>
      </select>
      <input
        type="number"
        min={0}
        value={discount.value}
        onChange={(e) =>
          onChange({ ...discount, value: Number(e.target.value) })
        }
        className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-brand"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-[11px] font-semibold text-faint hover:text-danger"
      >
        ✕
      </button>
    </div>
  );
}

function ConditionEditor({
  title,
  hint,
  condition,
  sources,
  onChange,
  allowAlwaysLabel = "Always",
}: {
  title: string;
  hint: string;
  condition?: FormCondition;
  sources: FormField[];
  onChange: (next: FormCondition | undefined) => void;
  allowAlwaysLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        {title}
      </p>
      <p className="text-[12px] leading-relaxed text-muted">{hint}</p>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          When field
        </span>
        <select
          value={condition?.fieldKey ?? ""}
          onChange={(e) => {
            const fieldKey = e.target.value;
            if (!fieldKey) {
              onChange(undefined);
              return;
            }
            onChange(
              normalizeCondition({
                fieldKey,
                op: condition?.op ?? "eq",
                value: condition?.value ?? "",
              }),
            );
          }}
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          <option value="">{allowAlwaysLabel}</option>
          {sources.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label || f.key}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Operator
        </span>
        <select
          value={condition?.op ?? "eq"}
          disabled={!condition?.fieldKey}
          onChange={(e) =>
            onChange(
              normalizeCondition({
                fieldKey: condition!.fieldKey,
                op: e.target.value as FormConditionOp,
                value: condition?.value,
              }),
            )
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand disabled:opacity-40"
        >
          {CONDITION_OPS.map((o) => (
            <option key={o.op} value={o.op}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Value
        </span>
        <input
          value={condition?.value ?? ""}
          disabled={
            !condition?.fieldKey ||
            condition.op === "empty" ||
            condition.op === "filled"
          }
          onChange={(e) =>
            onChange(
              normalizeCondition({
                fieldKey: condition!.fieldKey,
                op: condition!.op,
                value: e.target.value,
              }),
            )
          }
          placeholder="Match value"
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand disabled:opacity-40"
        />
      </label>
    </div>
  );
}

function OptionScoreAmountEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (partial: Partial<FormField>) => void;
}) {
  const items = resolveOptionItems(field);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Option score · amount
      </p>
      {items.map((item, idx) => (
        <div
          key={`${item.value}-${idx}`}
          className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-1.5"
        >
          <span className="truncate self-center text-[12.5px] font-semibold text-ink">
            {item.label}
          </span>
          <input
            type="number"
            title="Score"
            placeholder="Score"
            value={item.score ?? ""}
            onChange={(e) => {
              const next = [...items];
              const n = e.target.value === "" ? undefined : Number(e.target.value);
              next[idx] = { ...item, score: n };
              onChange(syncFieldOptions(next));
            }}
            className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-brand"
          />
          <input
            type="number"
            title="Amount"
            placeholder="$"
            min={0}
            value={item.amount ?? ""}
            onChange={(e) => {
              const next = [...items];
              const n = e.target.value === "" ? undefined : Number(e.target.value);
              next[idx] = { ...item, amount: n };
              onChange(syncFieldOptions(next));
            }}
            className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-brand"
          />
        </div>
      ))}
      {!items.length ? (
        <p className="text-[12px] text-faint">Add options on the Field tab first.</p>
      ) : null}
    </div>
  );
}

function SkipRuleRow({
  rule,
  sources,
  steps,
  onChange,
  onRemove,
}: {
  rule: FormSkipRule;
  sources: FormField[];
  steps: FormStep[];
  onChange: (next: FormSkipRule) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#e6e9f0] bg-white p-2.5">
      <ConditionEditor
        title="If"
        hint="Jump when this matches"
        condition={rule.condition}
        sources={sources}
        onChange={(condition) => {
          if (!condition) return;
          onChange({ ...rule, condition });
        }}
      />
      <label className="mt-2 block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Go to step
        </span>
        <select
          value={rule.gotoStepId}
          onChange={(e) => onChange({ ...rule, gotoStepId: e.target.value })}
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          {steps.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-[11.5px] font-semibold text-bad"
      >
        Remove skip rule
      </button>
    </div>
  );
}

function PricingRuleRow({
  rule,
  fields,
  sources,
  onChange,
  onRemove,
}: {
  rule: FormPricingRule;
  fields: FormField[];
  sources: FormField[];
  onChange: (next: FormPricingRule) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#e6e9f0] bg-white p-2.5">
      <label className="mb-2 block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          From field (option amounts)
        </span>
        <select
          value={rule.fieldKey}
          onChange={(e) => onChange({ ...rule, fieldKey: e.target.value })}
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          {fields.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label || f.key}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-2 block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Flat add-on
        </span>
        <input
          type="number"
          min={0}
          value={rule.amount ?? 0}
          onChange={(e) => onChange({ ...rule, amount: Number(e.target.value) })}
          className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </label>
      <ConditionEditor
        title="Only when (optional)"
        hint="Leave Always to always apply"
        condition={rule.condition}
        sources={sources}
        onChange={(condition) => onChange({ ...rule, condition })}
      />
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-[11.5px] font-semibold text-bad"
      >
        Remove pricing rule
      </button>
    </div>
  );
}
