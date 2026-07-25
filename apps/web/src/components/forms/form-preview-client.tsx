"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ChoiceOptionsControl } from "@/components/forms/choice-options-control";
import {
  effectivePlaceholder,
  fieldAnimatesFloat,
  fieldUsesFloating,
} from "@/components/forms/field-caption-shell";
import { FileUploadControl } from "@/components/forms/file-upload-control";
import { AppointmentPicker } from "@/components/forms/appointment-picker";
import { BudgetBreakdownView } from "@/components/forms/budget-breakdown";
import type {
  FormField,
  FormLayoutConfig,
  FormLogicConfig,
  FormStep,
} from "@/lib/db/schema";
import {
  fieldFloatText,
  fieldVisible,
  floatLabelInlineStyle,
} from "@/lib/forms/fields";
import { layoutProgressRatio, normalizeFormLayout } from "@/lib/forms/layout";
import {
  computeBudget,
  computeScore,
  fieldIsRequired,
  normalizeLogic,
  resolveNextStepIndex,
} from "@/lib/forms/smart-logic";
import { themeStyle, type FormTheme } from "@/lib/forms/theme";

/**
 * Standalone live preview for a saved form (list → Preview).
 */
export function FormPreviewClient({
  name,
  fields,
  steps,
  submitLabel,
  appearance,
  layout: layoutProp,
  logic: logicProp,
}: {
  name: string;
  fields: FormField[];
  steps: FormStep[];
  submitLabel: string;
  appearance: FormTheme;
  layout?: FormLayoutConfig;
  logic?: FormLogicConfig;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [focused, setFocused] = useState<Record<string, boolean>>({});
  const theme = appearance;
  const style = themeStyle(theme);
  const layout = useMemo(
    () => normalizeFormLayout(layoutProp, steps),
    [layoutProp, steps],
  );
  const logic = useMemo(() => normalizeLogic(logicProp), [logicProp]);
  const showScore = Boolean(logic.score?.enabled && logic.score.showLive !== false);
  const showPrice = Boolean(
    logic.pricing?.enabled && logic.pricing.showLive !== false,
  );
  const liveScore = showScore ? computeScore(fields, values) : 0;
  const liveBudget = showPrice ? computeBudget(logic, fields, values) : null;

  const conversationalFields = useMemo(
    () =>
      fields.filter(
        (f) =>
          f.type !== "hidden" &&
          f.type !== "section" &&
          f.type !== "recaptcha" &&
          fieldVisible(f, values),
      ),
    [fields, values],
  );

  const unitTotal =
    layout.mode === "conversational"
      ? Math.max(1, conversationalFields.length)
      : layout.mode === "single" || layout.mode === "accordion"
        ? 1
        : Math.max(1, steps.length);

  const step = steps[stepIndex] ?? steps[0];
  const stepFields =
    layout.mode === "single" || layout.mode === "accordion"
      ? fields.filter((f) => f.type !== "hidden" && fieldVisible(f, values))
      : layout.mode === "conversational"
        ? conversationalFields[stepIndex]
          ? [conversationalFields[stepIndex]]
          : []
        : fields.filter(
            (f) =>
              (f.stepId || steps[0]?.id) === step?.id && fieldVisible(f, values),
          );
  const isLast = stepIndex >= unitTotal - 1;

  const shellStyle: CSSProperties = {
    background: "var(--avx-input-bg, #fff)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--avx-input-border, #dbe1ea)",
    borderRadius: "var(--avx-radius, 8px)",
    width: "100%",
    minHeight: "var(--avx-input-h, 42px)",
    boxSizing: "border-box",
  };
  const fieldStyle: CSSProperties = {
    ...shellStyle,
    color: "var(--avx-input-text, #13233c)",
    padding: "var(--avx-pad-y, 10px) var(--avx-pad-x, 12px)",
    fontSize: "var(--avx-font-size, 14px)",
    fontFamily: "inherit",
    outline: "none",
  };

  return (
    <div
      style={{
        ...style,
        fontFamily: "var(--avx-font)",
        fontSize: "var(--avx-font-size)",
        color: "var(--avx-type-color)",
        background: "var(--avx-form-bg)",
        direction: theme.rtl ? "rtl" : "ltr",
      }}
      className={
        layout.mode === "card"
          ? "rounded-xl border border-[#e6e9f0] p-4 shadow-sm"
          : undefined
      }
    >
      <p className="mb-1 text-[15px] font-bold" style={{ color: "var(--avx-label)" }}>
        {name}
      </p>
      <p className="mb-2 text-[12px] text-faint">
        {layout.mode}
        {layout.mount && layout.mount !== "embedded" ? ` · ${layout.mount}` : ""}
        {unitTotal > 1
          ? ` · ${layout.mode === "conversational" ? "Q" : "Step"} ${stepIndex + 1}/${unitTotal}`
          : ""}
      </p>
      {layout.chrome?.progress &&
      layout.chrome.progress !== "none" &&
      unitTotal > 1 ? (
        <div className="mb-4 flex items-center gap-2">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--avx-progress-pending)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${layoutProgressRatio(stepIndex, unitTotal) * 100}%`,
                background: "var(--avx-progress-active)",
              }}
            />
          </div>
        </div>
      ) : null}

      {(showScore || showPrice) && (
        <div className="mb-3 flex flex-col gap-2">
          {showScore ? (
            <div
              className="flex flex-wrap gap-3 rounded-[10px] border px-3 py-2.5 text-[13px] font-bold"
              style={{
                borderColor: "var(--avx-input-border, #dbe1ea)",
                background: "var(--avx-upload-bg, #f8fafc)",
                color: "var(--avx-label)",
              }}
            >
              <span>
                {logic.score?.label || "Score"}: {liveScore}
              </span>
            </div>
          ) : null}
          {showPrice && liveBudget ? (
            <BudgetBreakdownView
              budget={liveBudget}
              label={logic.pricing?.label || "Estimate"}
            />
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-3.5">
        {stepFields.map((f) => {
          if (f.type === "section") {
            return (
              <div
                key={f.key}
                className="border-b pb-1 font-bold"
                style={{
                  color: "var(--avx-label)",
                  borderColor: "var(--avx-section-border)",
                  fontSize: "var(--avx-section-size)",
                }}
              >
                {f.label}
              </div>
            );
          }
          if (f.type === "hidden" || f.type === "recaptcha") return null;

          const floatText = fieldFloatText(f);
          const floating =
            fieldUsesFloating(f, appearance) &&
            Boolean(floatText) &&
            f.type !== "checkbox" &&
            f.type !== "toggle" &&
            f.type !== "file" &&
            f.type !== "multiselect" &&
            f.type !== "radio" &&
            f.type !== "select";
          const usingPlaceholderAsFloat = fieldAnimatesFloat(f, appearance);
          const stackedTitle =
            floating || appearance.labels.show === false
              ? ""
              : (f.label?.trim() ?? "");
          const phValue = effectivePlaceholder(f, appearance) ?? "";
          const isFocused = Boolean(focused[f.key]);
          const floatRaised =
            !usingPlaceholderAsFloat ||
            isFocused ||
            Boolean((values[f.key] ?? "").trim());
          const required = fieldIsRequired(f, values);

          if (f.type === "file") {
            return (
              <div key={f.key}>
                <FileUploadControl
                  label={stackedTitle || f.label}
                  required={required}
                  fileConfig={f.fileConfig}
                  valueLabel={values[f.key]}
                  showLabel={Boolean(stackedTitle)}
                  onChange={(names) =>
                    setValues((v) => ({ ...v, [f.key]: names }))
                  }
                />
              </div>
            );
          }

          if (f.type === "appointment") {
            return (
              <div key={f.key}>
                <AppointmentPicker
                  label={stackedTitle || f.label}
                  required={required}
                  appointmentConfig={f.appointmentConfig}
                  value={values[f.key]}
                  showLabel={Boolean(stackedTitle) || appearance.labels.show !== false}
                  onChange={(next) =>
                    setValues((v) => ({ ...v, [f.key]: next }))
                  }
                />
              </div>
            );
          }

          if (
            f.type === "select" ||
            f.type === "multiselect" ||
            f.type === "radio"
          ) {
            return (
              <div key={f.key}>
                <ChoiceOptionsControl
                  field={f}
                  value={values[f.key] ?? ""}
                  showLabel={Boolean(stackedTitle)}
                  onChange={(next) =>
                    setValues((v) => ({ ...v, [f.key]: next }))
                  }
                />
              </div>
            );
          }

          return (
            <label
              key={f.key}
              className="block"
              style={{
                color: "var(--avx-label)",
                position: floating ? "relative" : undefined,
                marginTop: floating
                  ? "calc(var(--avx-label-size, 13px) * 0.55)"
                  : undefined,
              }}
            >
              {f.type !== "checkbox" && f.type !== "toggle" && floating ? (
                <span
                  style={
                    floatLabelInlineStyle({
                      animate: usingPlaceholderAsFloat,
                      raised: floatRaised,
                      focused: isFocused,
                      textarea: f.type === "textarea",
                    }) as CSSProperties
                  }
                >
                  {floatText}
                  {required ? (
                    <span style={{ color: "var(--avx-required)" }}>
                      {" "}
                      {theme.labels.requiredText}
                    </span>
                  ) : null}
                </span>
              ) : f.type !== "checkbox" && f.type !== "toggle" && stackedTitle ? (
                <span
                  className="avx-label-text mb-1.5 block font-semibold"
                  style={{
                    display: "var(--avx-label-display)",
                    fontSize: "var(--avx-label-size)",
                  }}
                >
                  {stackedTitle}
                  {required ? (
                    <span style={{ color: "var(--avx-required)" }}>
                      {" "}
                      {theme.labels.requiredText}
                    </span>
                  ) : null}
                </span>
              ) : null}

              {f.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={values[f.key] ?? ""}
                  placeholder={usingPlaceholderAsFloat ? " " : phValue || undefined}
                  onFocus={() => setFocused((s) => ({ ...s, [f.key]: true }))}
                  onBlur={() => setFocused((s) => ({ ...s, [f.key]: false }))}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  style={{ ...fieldStyle, minHeight: 84 }}
                />
              ) : f.type === "checkbox" || f.type === "toggle" ? (
                <span
                  className="flex items-center gap-2"
                  style={{ color: "var(--avx-input-text)" }}
                >
                  <input
                    type="checkbox"
                    checked={values[f.key] === "1"}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [f.key]: e.target.checked ? "1" : "",
                      }))
                    }
                  />
                  {f.label}
                </span>
              ) : (
                <input
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : f.type === "url"
                          ? "url"
                          : f.type === "phone"
                            ? "tel"
                            : "text"
                  }
                  value={values[f.key] ?? ""}
                  placeholder={usingPlaceholderAsFloat ? " " : phValue || undefined}
                  onFocus={() => setFocused((s) => ({ ...s, [f.key]: true }))}
                  onBlur={() => setFocused((s) => ({ ...s, [f.key]: false }))}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.value }))
                  }
                  style={fieldStyle}
                />
              )}
              {f.description?.trim() &&
              (f.caption?.descriptionPosition ?? "below") === "below" ? (
                <p
                  className="mt-1.5 mb-0 text-[12px] leading-snug"
                  style={{ color: "var(--avx-text-muted, #5b6b83)" }}
                >
                  {f.description}
                </p>
              ) : null}
            </label>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {stepIndex > 0 &&
        layout.mode !== "single" &&
        layout.mode !== "accordion" ? (
          <button
            type="button"
            onClick={() => setStepIndex((i) => i - 1)}
            className="rounded-lg px-4 py-2.5 text-[13px] font-semibold"
            style={{
              background: "var(--avx-prev-bg)",
              color: "var(--avx-prev-text)",
              borderRadius: "var(--avx-btn-radius)",
            }}
          >
            Back
          </button>
        ) : null}
        {isLast || layout.mode === "single" || layout.mode === "accordion" ? (
          <button
            type="button"
            className="rounded-lg px-4 py-2.5 text-[13px] font-semibold"
            style={{
              background: "var(--avx-btn-bg)",
              color: "var(--avx-btn-text)",
              borderRadius: "var(--avx-btn-radius)",
            }}
          >
            {submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              setStepIndex((i) =>
                layout.mode === "conversational"
                  ? Math.min(i + 1, unitTotal - 1)
                  : resolveNextStepIndex(i, steps, logic.skipRules, values),
              )
            }
            className="rounded-lg px-4 py-2.5 text-[13px] font-semibold"
            style={{
              background: "var(--avx-next-bg)",
              color: "var(--avx-next-text)",
              borderRadius: "var(--avx-btn-radius)",
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
