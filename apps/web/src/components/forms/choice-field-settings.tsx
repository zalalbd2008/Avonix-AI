"use client";

import type {
  FormChoiceConfig,
  FormField,
  FormFieldType,
  FormOptionItem,
} from "@/lib/db/schema";
import { IconPicker } from "@/components/forms/icons";
import {
  CHOICE_LAYOUTS,
  CHOICE_STYLES,
  SELECT_VARIANTS,
  resolveChoiceConfig,
  resolveOptionItems,
  sampleCardChoiceItems,
  sampleIconChoiceItems,
  sampleImageChoiceItems,
  syncFieldOptions,
  usesRichChoiceMedia,
} from "@/lib/forms/choice-config";

/**
 * Field settings: layout / style / rich options for choice fields.
 */
export function ChoiceFieldSettings({
  field,
  onPatch,
}: {
  field: FormField;
  onPatch: (partial: Partial<FormField>) => void;
}) {
  const type = field.type;
  if (
    type !== "radio" &&
    type !== "multiselect" &&
    type !== "select" &&
    type !== "checkbox"
  ) {
    return null;
  }

  const cfg = resolveChoiceConfig(type, field.choiceConfig);
  const items = resolveOptionItems(field);
  const rich = usesRichChoiceMedia(cfg.style);

  function patchChoice(partial: Partial<FormChoiceConfig>) {
    onPatch({
      choiceConfig: resolveChoiceConfig(type, { ...cfg, ...partial }),
    });
  }

  function applyPreset(
    style: FormChoiceConfig["style"],
    samples: FormOptionItem[],
  ) {
    const synced = syncFieldOptions(samples);
    onPatch({
      choiceConfig: resolveChoiceConfig(type, {
        ...cfg,
        style,
        layout: "grid",
        columns: 3,
      }),
      ...synced,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Inline controls
      </p>

      {type === "select" ? (
        <label className="block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Dropdown style
          </span>
          <select
            value={cfg.selectVariant}
            onChange={(e) =>
              patchChoice({
                selectVariant: e.target.value as FormChoiceConfig["selectVariant"],
              })
            }
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
          >
            {SELECT_VARIANTS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} — {v.hint}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Layout
            </span>
            <select
              value={cfg.layout}
              onChange={(e) =>
                patchChoice({
                  layout: e.target.value as FormChoiceConfig["layout"],
                })
              }
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              {CHOICE_LAYOUTS.filter((l) => l.types.includes(type as FormFieldType)).map(
                (l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.hint}
                  </option>
                ),
              )}
            </select>
          </label>
          {type !== "checkbox" ? (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Style
              </span>
              <select
                value={cfg.style}
                onChange={(e) =>
                  patchChoice({
                    style: e.target.value as FormChoiceConfig["style"],
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                {CHOICE_STYLES.filter((s) =>
                  s.types.includes(type as FormFieldType),
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — {s.hint}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {(cfg.layout === "grid" || cfg.layout === "masonry") && (
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Columns
              </span>
              <select
                value={cfg.columns}
                onChange={(e) =>
                  patchChoice({
                    columns: Number(e.target.value) as 2 | 3 | 4,
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
          )}
        </>
      )}

      {type === "radio" || type === "multiselect" ? (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset("image", sampleImageChoiceItems())}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Image choice
          </button>
          <button
            type="button"
            onClick={() => applyPreset("icon", sampleIconChoiceItems())}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Icon choice
          </button>
          <button
            type="button"
            onClick={() => applyPreset("pricing", sampleCardChoiceItems())}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Card choice
          </button>
        </div>
      ) : null}

      {rich || type === "radio" || type === "multiselect" || type === "select" ? (
        <div className="flex flex-col gap-2">
          <span className="text-[11.5px] font-semibold text-muted">
            Options {rich ? "(rich)" : ""}
          </span>
          {items.map((item, idx) => (
            <div
              key={`${item.value}-${idx}`}
              className="rounded-lg border border-[#e6e9f0] bg-white p-2"
            >
              <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                <input
                  value={item.label}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = {
                      ...item,
                      label: e.target.value,
                      value: item.value || e.target.value,
                    };
                    onPatch(syncFieldOptions(next));
                  }}
                  placeholder="Label"
                  className="rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
                />
                <input
                  value={item.value}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...item, value: e.target.value };
                    onPatch(syncFieldOptions(next));
                  }}
                  placeholder="Value"
                  className="rounded-md border border-[#dbe1ea] px-2 py-1.5 font-mono text-[12px] outline-none focus:border-brand"
                />
              </div>
              {rich ? (
                <>
                  <input
                    value={item.description ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, description: e.target.value };
                      onPatch(syncFieldOptions(next));
                    }}
                    placeholder="Description"
                    className="mb-1.5 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
                  />
                  <div className="mb-1.5">
                    <IconPicker
                      value={item.icon}
                      onChange={(icon) => {
                        const next = [...items];
                        next[idx] = { ...item, icon };
                        onPatch(syncFieldOptions(next));
                      }}
                    />
                  </div>
                  <input
                    value={item.price ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...item, price: e.target.value };
                      onPatch(syncFieldOptions(next));
                    }}
                    placeholder="Price"
                    className="mb-1.5 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
                  />
                  {(cfg.style === "image" || cfg.style === "product") && (
                    <input
                      value={item.imageUrl ?? ""}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...item, imageUrl: e.target.value };
                        onPatch(syncFieldOptions(next));
                      }}
                      placeholder="Image URL"
                      className="mt-1.5 w-full rounded-md border border-[#dbe1ea] px-2 py-1.5 text-[12px] outline-none focus:border-brand"
                    />
                  )}
                </>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const next = items.filter((_, i) => i !== idx);
                  onPatch(syncFieldOptions(next));
                }}
                className="mt-1.5 text-[11px] font-semibold text-bad"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const n = items.length + 1;
              onPatch(
                syncFieldOptions([
                  ...items,
                  { value: `option_${n}`, label: `Option ${n}` },
                ]),
              );
            }}
            className="rounded-lg border border-dashed border-[#dbe1ea] px-2 py-2 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            + Add option
          </button>
        </div>
      ) : null}
    </div>
  );
}
