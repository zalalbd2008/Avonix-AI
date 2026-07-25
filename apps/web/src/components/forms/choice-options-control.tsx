"use client";

import { useState, type CSSProperties } from "react";
import { ChoiceIconPreview } from "@/components/forms/icons";
import type { FormChoiceStyle, FormField } from "@/lib/db/schema";
import {
  resolveChoiceConfig,
  resolveOptionItems,
  usesRichChoiceMedia,
} from "@/lib/forms/choice-config";

/**
 * Renders radio / multiselect / chip-select options with layout + style.
 */
export function ChoiceOptionsControl({
  field,
  value,
  onChange,
  showLabel = true,
}: {
  field: FormField;
  value: string;
  onChange: (next: string) => void;
  showLabel?: boolean;
}) {
  const cfg = resolveChoiceConfig(field.type, field.choiceConfig);
  const items = resolveOptionItems(field);
  const multi = field.type === "multiselect";
  const selected = multi
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : value
      ? [value]
      : [];
  const rich = usesRichChoiceMedia(cfg.style);
  const isSelectChips =
    field.type === "select" &&
    (cfg.selectVariant === "chips" || cfg.selectVariant === "tags");

  function toggle(v: string) {
    if (multi) {
      const set = new Set(selected);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      onChange([...set].join(", "));
      return;
    }
    onChange(v);
  }

  if (field.type === "select" && !isSelectChips) {
    return (
      <div>
        {showLabel && field.label ? (
          <FieldLabel label={field.label} required={field.required} />
        ) : null}
        {cfg.selectVariant === "searchable" ? (
          <SearchableSelect
            items={items}
            value={value}
            onChange={onChange}
            required={field.required}
          />
        ) : (
          <select
            value={value}
            required={field.required}
            onChange={(e) => onChange(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select…</option>
            {items.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  return (
    <div>
      {showLabel && field.label ? (
        <FieldLabel label={field.label} required={field.required} />
      ) : null}
      <div style={layoutStyle(cfg.layout, cfg.columns, cfg.gap)}>
        {items.map((o) => {
          const on = selected.includes(o.value);
          return (
            <label
              key={o.value}
              style={choiceItemStyle(cfg.style, on, isSelectChips)}
            >
              <input
                type={multi || isSelectChips ? "checkbox" : "radio"}
                name={field.key}
                value={o.value}
                checked={on}
                onChange={() => {
                  if (isSelectChips && !multi) {
                    onChange(on ? "" : o.value);
                    return;
                  }
                  toggle(o.value);
                }}
                style={
                  cfg.style === "default" && !isSelectChips
                    ? { marginTop: 2 }
                    : { position: "absolute", opacity: 0, pointerEvents: "none" }
                }
              />
              {rich || cfg.style !== "default" || isSelectChips ? (
                <span
                  style={{
                    display: "flex",
                    flexDirection: cfg.style === "icon" ? "row" : "column",
                    alignItems: cfg.style === "icon" ? "center" : "stretch",
                    gap: cfg.style === "icon" ? 10 : 6,
                    width: "100%",
                    minWidth: 0,
                  }}
                >
                  {(cfg.style === "image" || cfg.style === "product") &&
                  o.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.imageUrl}
                      alt=""
                      style={{
                        width: "100%",
                        aspectRatio: "16 / 10",
                        objectFit: "cover",
                        borderRadius: 8,
                        background: "#f1f4f8",
                      }}
                    />
                  ) : null}
                  {(cfg.style === "icon" ||
                    cfg.style === "pricing" ||
                    cfg.style === "service" ||
                    cfg.style === "product") &&
                  o.icon ? (
                    <span
                      aria-hidden
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "#f1f4f8",
                        fontSize: 20,
                        flexShrink: 0,
                        color: "var(--avx-text, #13233c)",
                      }}
                    >
                      <ChoiceIconPreview icon={o.icon} size={22} />
                    </span>
                  ) : null}
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      minWidth: 0,
                    }}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>
                      {o.label}
                    </span>
                    {o.description ? (
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--avx-text-muted, #5b6b83)",
                          lineHeight: 1.35,
                        }}
                      >
                        {o.description}
                      </span>
                    ) : null}
                    {o.price ? (
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--avx-input-focus-border, #ff6600)",
                        }}
                      >
                        {o.price}
                      </span>
                    ) : null}
                  </span>
                </span>
              ) : (
                <span style={{ fontSize: 13.5 }}>{o.label}</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span
      className="mb-1.5 block text-[13px] font-semibold"
      style={{ color: "var(--avx-label)" }}
    >
      {label}
      {required ? <span style={{ color: "var(--avx-required)" }}> *</span> : null}
    </span>
  );
}

const selectStyle: CSSProperties = {
  width: "100%",
  minHeight: "var(--avx-input-h, 42px)",
  padding: "var(--avx-pad-y, 10px) var(--avx-pad-x, 12px)",
  border: "1px solid var(--avx-input-border, #dbe1ea)",
  borderRadius: "var(--avx-radius, 8px)",
  background: "var(--avx-input-bg, #fff)",
  color: "var(--avx-input-text, #13233c)",
  font: "inherit",
};

function layoutStyle(
  layout: string,
  columns: number,
  gap: number,
): CSSProperties {
  const base: CSSProperties = { width: "100%", gap };
  if (layout === "grid") {
    return {
      ...base,
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    };
  }
  if (layout === "masonry") {
    return {
      ...base,
      columnCount: columns,
      columnGap: gap,
    };
  }
  if (layout === "horizontal" || layout === "inline") {
    return {
      ...base,
      display: "flex",
      flexDirection: "row",
      flexWrap: "nowrap",
      overflowX: "auto",
    };
  }
  if (layout === "wrap") {
    return {
      ...base,
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
    };
  }
  return { ...base, display: "flex", flexDirection: "column" };
}

function choiceItemStyle(
  style: FormChoiceStyle,
  on: boolean,
  chips: boolean,
): CSSProperties {
  const selected: CSSProperties = on
    ? {
        borderColor: "var(--avx-input-focus-border, #ff6600)",
        boxShadow: "0 0 0 3px rgba(255,102,0,.12)",
        background: "rgba(255,102,0,.04)",
      }
    : {};

  if (style === "default" && !chips) {
    return {
      position: "relative",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      cursor: "pointer",
      margin: 0,
      fontWeight: 400,
      color: "var(--avx-input-text, #13233c)",
    };
  }

  if (style === "button" || chips) {
    return {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      cursor: "pointer",
      margin: 0,
      padding: "8px 14px",
      border: "1px solid var(--avx-input-border, #dbe1ea)",
      borderRadius: chips && style !== "button" ? 8 : 999,
      background: "var(--avx-input-bg, #fff)",
      ...selected,
    };
  }

  return {
    position: "relative",
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    cursor: "pointer",
    margin: 0,
    padding: 12,
    border: "1px solid var(--avx-input-border, #dbe1ea)",
    borderRadius: 12,
    background: "var(--avx-input-bg, #fff)",
    breakInside: "avoid",
    marginBottom: style === "default" ? 0 : undefined,
    ...selected,
  };
}

function SearchableSelect({
  items,
  value,
  onChange,
  required,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = items.filter(
    (o) =>
      !q.trim() ||
      o.label.toLowerCase().includes(q.trim().toLowerCase()) ||
      o.value.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        style={{
          width: "100%",
          minHeight: 36,
          padding: "8px 12px",
          border: "1px solid var(--avx-input-border, #dbe1ea)",
          borderRadius: "var(--avx-radius, 8px)",
          background: "var(--avx-input-bg, #fff)",
          font: "inherit",
          fontSize: 13,
        }}
      />
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        size={Math.min(6, Math.max(3, filtered.length + 1))}
        style={{
          width: "100%",
          padding: 6,
          border: "1px solid var(--avx-input-border, #dbe1ea)",
          borderRadius: "var(--avx-radius, 8px)",
          background: "var(--avx-input-bg, #fff)",
          color: "var(--avx-input-text, #13233c)",
          font: "inherit",
        }}
      >
        <option value="">Select…</option>
        {filtered.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
