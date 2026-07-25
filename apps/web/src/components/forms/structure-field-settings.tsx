"use client";

import type {
  FormContainerVariant,
  FormField,
  FormFieldContainer,
  FormRowAlign,
  FormRowConfig,
  FormSectionConfig,
} from "@/lib/db/schema";
import {
  CONTAINER_VARIANTS,
  ROW_ALIGN_X,
  ROW_ALIGN_Y,
  ROW_MODES,
  normalizeContainer,
  normalizeRowConfig,
  normalizeSectionConfig,
  newRowId,
} from "@/lib/forms/structure";

/**
 * Section / row / column / container chrome controls.
 */
export function StructureFieldSettings({
  field,
  rows,
  selectedKeys,
  onPatchField,
  onPatchRows,
  onGroupIntoRow,
  onClearRow,
  onDuplicateRow,
}: {
  field: FormField;
  rows: FormRowConfig[];
  selectedKeys: string[];
  onPatchField: (partial: Partial<FormField>) => void;
  onPatchRows: (rows: FormRowConfig[]) => void;
  onGroupIntoRow: () => void;
  onClearRow: () => void;
  onDuplicateRow: () => void;
}) {
  const row = field.rowId
    ? rows.find((r) => r.id === field.rowId)
    : undefined;
  const container = field.container ?? {};
  const section = field.sectionConfig ?? {};

  function patchContainer(partial: Partial<FormFieldContainer>) {
    onPatchField({
      container: normalizeContainer({ ...container, ...partial }),
    });
  }

  function patchSection(partial: Partial<FormSectionConfig>) {
    onPatchField({
      sectionConfig: normalizeSectionConfig({ ...section, ...partial }),
    });
  }

  function patchRow(partial: Partial<FormRowConfig>) {
    if (!field.rowId) return;
    const base = row ?? { id: field.rowId };
    const next = normalizeRowConfig({ ...base, ...partial });
    if (!next) return;
    const exists = rows.some((r) => r.id === next.id);
    onPatchRows(
      exists
        ? rows.map((r) => (r.id === next.id ? next : r))
        : [...rows, next],
    );
  }

  function setRowMode(mode: "grid" | "flex") {
    if (!field.rowId) return;
    const base: FormRowConfig = { ...(row ?? { id: field.rowId }) };
    if (mode === "grid") {
      delete base.mode;
      delete base.wrap;
    } else {
      base.mode = "flex";
      base.wrap = true;
    }
    const next = normalizeRowConfig(base);
    if (!next) return;
    const exists = rows.some((r) => r.id === next.id);
    onPatchRows(
      exists
        ? rows.map((r) => (r.id === next.id ? next : r))
        : [...rows, next],
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Section · row · container
      </p>

      {field.type === "section" ? (
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={Boolean(section.collapsible)}
              onChange={(e) => {
                const next = { ...section };
                if (e.target.checked) next.collapsible = true;
                else {
                  delete next.collapsible;
                  delete next.collapsed;
                }
                onPatchField({
                  sectionConfig: normalizeSectionConfig(next),
                });
              }}
            />
            Collapsible section
          </label>
          {section.collapsible ? (
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={Boolean(section.collapsed)}
                onChange={(e) => {
                  const next = { ...section };
                  if (e.target.checked) next.collapsed = true;
                  else delete next.collapsed;
                  onPatchField({
                    sectionConfig: normalizeSectionConfig(next),
                  });
                }}
              />
              Start collapsed
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            <input
              type="checkbox"
              checked={section.divider !== false}
              onChange={(e) => patchSection({ divider: e.target.checked })}
            />
            Show divider
          </label>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Section background
            </span>
            <input
              type="color"
              value={section.background || "#f8fafc"}
              onChange={(e) => patchSection({ background: e.target.value })}
              className="h-9 w-full cursor-pointer rounded-lg border border-[#dbe1ea] bg-white"
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold text-muted">Row</span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={selectedKeys.length < 2}
            onClick={onGroupIntoRow}
            className="rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
          >
            Group selection into row
          </button>
          {field.rowId ? (
            <>
              <button
                type="button"
                onClick={onDuplicateRow}
                className="rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
              >
                Duplicate row
              </button>
              <button
                type="button"
                onClick={onClearRow}
                className="rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
              >
                Ungroup row
              </button>
            </>
          ) : null}
        </div>
        {field.rowId ? (
          <p className="text-[11px] text-faint">
            Row id: <span className="font-mono">{field.rowId}</span>
          </p>
        ) : (
          <p className="text-[11px] text-faint">
            Select 2+ fields (⌘/Ctrl click) to group into a row.
          </p>
        )}
        {field.rowId ? (
          <>
            <div>
              <span className="mb-1.5 block text-[11.5px] font-semibold text-muted">
                Layout mode
              </span>
              <div className="flex gap-1 rounded-lg border border-[#dbe1ea] bg-white p-0.5">
                {ROW_MODES.map((m) => {
                  const active = (row?.mode ?? "grid") === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      title={m.hint}
                      onClick={() => setRowMode(m.id)}
                      className={`flex-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold transition ${
                        active
                          ? "bg-brand text-white"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-faint">
                {(row?.mode ?? "grid") === "flex"
                  ? "Flex wraps columns freely — add as many as you need."
                  : "Grid keeps fields on a strict 12-column track."}
              </p>
            </div>
            {(row?.mode ?? "grid") === "flex" ? (
              <label className="flex items-center gap-2 text-[12.5px] text-muted">
                <input
                  type="checkbox"
                  checked={row?.wrap !== false}
                  onChange={(e) =>
                    patchRow({ wrap: e.target.checked ? true : false })
                  }
                />
                Allow wrap
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input
                type="checkbox"
                checked={Boolean(row?.equalHeight)}
                onChange={(e) =>
                  patchRow({ equalHeight: e.target.checked || undefined })
                }
              />
              Equal height
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Vertical align
              </span>
              <select
                value={row?.alignY ?? "stretch"}
                onChange={(e) =>
                  patchRow({ alignY: e.target.value as FormRowAlign })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                {ROW_ALIGN_Y.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Horizontal align
              </span>
              <select
                value={row?.alignX ?? "stretch"}
                onChange={(e) =>
                  patchRow({
                    alignX: e.target.value as NonNullable<FormRowConfig["alignX"]>,
                  })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                {ROW_ALIGN_X.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Row gap (px)
              </span>
              <input
                type="number"
                min={0}
                max={48}
                value={row?.gap ?? 12}
                onChange={(e) => patchRow({ gap: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11.5px] font-semibold text-muted">Column</span>
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(field.lockWidth)}
            onChange={(e) =>
              onPatchField({ lockWidth: e.target.checked || undefined })
            }
          />
          Lock width
        </label>
        <p className="text-[11px] text-faint">
          Width / responsive spans stay editable in the width panel unless locked.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="mb-0.5 text-[11.5px] font-semibold text-muted">
          Container style
        </span>
        <select
          value={container.variant ?? "none"}
          onChange={(e) =>
            patchContainer({
              variant: e.target.value as FormContainerVariant,
            })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          {CONTAINER_VARIANTS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} — {v.hint}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          <input
            type="checkbox"
            checked={Boolean(container.hover)}
            onChange={(e) =>
              patchContainer({ hover: e.target.checked || undefined })
            }
          />
          Hover effect
        </label>
        {(container.variant && container.variant !== "none") ||
        container.hover ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Padding
              </span>
              <input
                type="number"
                min={0}
                max={48}
                value={container.padding ?? 14}
                onChange={(e) =>
                  patchContainer({ padding: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Radius
              </span>
              <input
                type="number"
                min={0}
                max={32}
                value={container.radius ?? 12}
                onChange={(e) =>
                  patchContainer({ radius: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
          </div>
        ) : null}
      </div>

      {!field.rowId && selectedKeys.length === 1 ? (
        <button
          type="button"
          onClick={() =>
            onPatchField({
              rowId: newRowId(),
            })
          }
          className="rounded-lg border border-dashed border-[#dbe1ea] px-2 py-2 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
        >
          Start a new row from this field
        </button>
      ) : null}
    </div>
  );
}
