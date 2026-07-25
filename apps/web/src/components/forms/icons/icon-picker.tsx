"use client";

import { useDeferredValue, useEffect, useId, useRef, useState } from "react";
import { FormIcon } from "./form-icon";
import {
  ICON_CATEGORIES,
  getIconDef,
  iconsInCategory,
  isIconName,
  searchIcons,
  type IconCategory,
  type IconName,
} from "./registry";

type Props = {
  value?: string;
  onChange: (icon: string | undefined) => void;
  /** Allow clearing the selection. */
  clearable?: boolean;
  /** Also keep a free-text / emoji field. */
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Searchable icon picker — categories + live search (Step 10).
 * Stores registry icon names; custom emoji/text still supported when allowCustom.
 */
export function IconPicker({
  value,
  onChange,
  clearable = true,
  allowCustom = true,
  disabled,
  className,
}: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<IconCategory | "all">("all");
  const deferredQuery = useDeferredValue(query);

  const named = isIconName(value) ? value : null;
  const custom = value && !named ? value : "";

  const results =
    category === "all"
      ? searchIcons(deferredQuery, 80)
      : iconsInCategory(category).filter((i) => {
          const q = deferredQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            i.name.includes(q) ||
            i.label.toLowerCase().includes(q) ||
            (i.keywords ?? []).some((k) => k.includes(q))
          );
        });

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(name: IconName) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <div className="flex gap-1.5">
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[#dbe1ea] bg-white px-2 py-1.5 text-left text-[12.5px] hover:border-brand disabled:opacity-40"
        >
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[#f1f4f8] text-muted">
            {named ? (
              <FormIcon name={named} size="sm" />
            ) : custom ? (
              <span className="text-[14px] leading-none">{custom}</span>
            ) : (
              <FormIcon name="icon" size="sm" />
            )}
          </span>
          <span className="min-w-0 truncate font-medium text-[#13233c]">
            {named
              ? (getIconDef(named)?.label ?? named)
              : custom
                ? custom
                : "Pick icon…"}
          </span>
        </button>
        {clearable && value ? (
          <button
            type="button"
            disabled={disabled}
            title="Clear icon"
            onClick={() => onChange(undefined)}
            className="rounded-md border border-[#dbe1ea] px-2 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
          >
            Clear
          </button>
        ) : null}
      </div>

      {allowCustom ? (
        <input
          value={custom}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v.trim() ? v : undefined);
          }}
          placeholder="Or type emoji / custom"
          className="mt-1.5 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px] outline-none focus:border-brand disabled:opacity-40"
        />
      ) : null}

      {open ? (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-40 overflow-hidden rounded-xl border border-[#dbe1ea] bg-white shadow-lg">
          <div className="border-b border-[#edf0f5] p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand"
            />
            <div className="mt-2 flex gap-1 overflow-x-auto pb-0.5">
              <CatChip
                label="All"
                active={category === "all"}
                onClick={() => setCategory("all")}
              />
              {ICON_CATEGORIES.map((c) => (
                <CatChip
                  key={c.id}
                  label={c.label}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                />
              ))}
            </div>
          </div>
          <div className="grid max-h-52 grid-cols-6 gap-1 overflow-y-auto p-2">
            {results.length ? (
              results.map((icon) => (
                <button
                  key={icon.name}
                  type="button"
                  title={icon.label}
                  onClick={() => pick(icon.name)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 hover:border-brand hover:bg-[#fff8f3] ${
                    named === icon.name
                      ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                      : "border-transparent text-muted"
                  }`}
                >
                  <FormIcon name={icon.name} size="md" />
                  <span className="w-full truncate text-center text-[9px] font-medium">
                    {icon.label}
                  </span>
                </button>
              ))
            ) : (
              <p className="col-span-6 py-6 text-center text-[12px] text-faint">
                No icons match “{query}”
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
        active
          ? "bg-brand text-white"
          : "bg-[#f1f4f8] text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

/** Compact preview of a stored icon string (registry name or emoji). */
export function ChoiceIconPreview({
  icon,
  size = 20,
  className,
}: {
  icon?: string;
  size?: number;
  className?: string;
}) {
  if (!icon) return null;
  if (isIconName(icon)) {
    return <FormIcon name={icon} size={size} className={className} />;
  }
  return (
    <span className={className} style={{ fontSize: size * 0.9 }} aria-hidden>
      {icon}
    </span>
  );
}
