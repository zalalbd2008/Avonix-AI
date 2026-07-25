"use client";

import type { CSSProperties, ReactNode } from "react";
import type { FormField } from "@/lib/db/schema";
import { resolveCaption } from "@/lib/forms/field-caption";
import type { FormTheme } from "@/lib/forms/theme";

/**
 * Shared label / description / position chrome for builder + live preview.
 */
export function FieldCaptionShell({
  field,
  theme,
  children,
  style,
  className,
}: {
  field: FormField;
  theme: Pick<FormTheme, "labels" | "placeholder">;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  const cap = resolveCaption(field, theme);
  const title = field.label?.trim() ?? "";
  const showLabel =
    cap.showStackedLabel && Boolean(title) && theme.labels.show !== false;

  const shellStyle: CSSProperties = {
    ...style,
    ...(cap.sticky ? { position: "sticky", top: 12, zIndex: 2 } : {}),
    ...(cap.align === "start"
      ? { justifySelf: "start", width: "auto", maxWidth: "100%" }
      : cap.align === "center"
        ? { justifySelf: "center", width: "auto", maxWidth: "100%" }
        : cap.align === "end"
          ? { justifySelf: "end", width: "auto", maxWidth: "100%" }
          : {}),
    ...(cap.labelPosition === "left"
      ? {
          display: "grid",
          gridTemplateColumns: "minmax(5.5rem, 28%) minmax(0, 1fr)",
          gap: "8px 14px",
          alignItems: "start",
        }
      : cap.labelPosition === "right"
        ? {
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(5.5rem, 28%)",
            gap: "8px 14px",
            alignItems: "start",
          }
        : {}),
  };

  const labelEl = showLabel ? (
    <span
      className="avx-label-row flex items-center gap-1.5"
      style={{
        marginBottom:
          cap.labelPosition === "left" || cap.labelPosition === "right"
            ? 0
            : "var(--avx-label-mb, 6px)",
        paddingTop:
          cap.labelPosition === "left" || cap.labelPosition === "right"
            ? 6
            : undefined,
        order: cap.labelPosition === "right" ? 2 : undefined,
        ...(cap.labelPosition === "hidden"
          ? {
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0,0,0,0)",
            }
          : {}),
      }}
    >
      <span
        className="avx-label-text font-semibold"
        style={{
          color: "var(--avx-label)",
          fontSize: "var(--avx-label-size)",
        }}
      >
        {title}
        {field.required ? (
          <span style={{ color: "var(--avx-required)" }}>
            {" "}
            {theme.labels.requiredText}
          </span>
        ) : null}
      </span>
      {cap.description && cap.descriptionPosition === "info" ? (
        <span
          title={cap.description}
          className="inline-flex size-[18px] items-center justify-center rounded-full bg-[#f1f4f8] text-[11px] text-faint"
        >
          ⓘ
        </span>
      ) : null}
    </span>
  ) : null;

  const desc = (where: "above" | "below") => {
    if (!cap.description) return null;
    if (cap.descriptionPosition !== where) return null;
    return (
      <p
        className="m-0 text-[12px] leading-snug"
        style={{ color: "var(--avx-text-muted, #5b6b83)" }}
      >
        {cap.description}
      </p>
    );
  };

  const accordion =
    cap.description && cap.descriptionPosition === "accordion" ? (
      <details className="text-[12px] text-faint">
        <summary className="cursor-pointer font-semibold text-[#13233c]">
          More info
        </summary>
        <p className="mt-1.5 mb-0">{cap.description}</p>
      </details>
    ) : null;

  const control = (
    <span
      className="avx-control flex min-w-0 flex-col gap-1.5"
      style={{ order: cap.labelPosition === "right" ? 1 : undefined }}
      title={
        cap.descriptionPosition === "tooltip" ? cap.description || undefined : undefined
      }
    >
      {desc("above")}
      {children}
      {desc("below")}
      {accordion}
    </span>
  );

  return (
    <div className={className} style={shellStyle}>
      {labelEl}
      {control}
    </div>
  );
}

export function effectivePlaceholder(
  field: FormField,
  theme: Pick<FormTheme, "labels" | "placeholder">,
): string | undefined {
  return resolveCaption(field, theme).placeholderAttr;
}

export function fieldUsesFloating(
  field: FormField,
  theme: Pick<FormTheme, "labels" | "placeholder">,
): boolean {
  return resolveCaption(field, theme).useFloating;
}

export function fieldAnimatesFloat(
  field: FormField,
  theme: Pick<FormTheme, "labels" | "placeholder">,
): boolean {
  return resolveCaption(field, theme).animateFloat;
}
