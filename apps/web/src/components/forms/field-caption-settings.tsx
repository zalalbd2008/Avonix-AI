"use client";

import type {
  FormDescriptionPosition,
  FormField,
  FormFieldAlign,
  FormFieldCaption,
  FormLabelPosition,
  FormPlaceholderMode,
} from "@/lib/db/schema";
import {
  DESCRIPTION_POSITIONS,
  FIELD_ALIGNS,
  LABEL_POSITIONS,
  PLACEHOLDER_MODES,
  normalizeCaption,
} from "@/lib/forms/field-caption";

/**
 * Per-field label / description / placeholder / position controls.
 */
export function FieldCaptionSettings({
  field,
  onPatch,
}: {
  field: FormField;
  onPatch: (partial: Partial<FormField>) => void;
}) {
  if (field.type === "section" || field.type === "hidden" || field.type === "recaptcha") {
    return null;
  }

  const caption = field.caption ?? {};

  function patchCaption(partial: Partial<FormFieldCaption>) {
    onPatch({
      caption: normalizeCaption({ ...caption, ...partial }),
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Label · description · position
      </p>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Description
        </span>
        <textarea
          rows={2}
          value={field.description ?? ""}
          onChange={(e) =>
            onPatch({ description: e.target.value.slice(0, 500) || undefined })
          }
          placeholder="Help text for this field"
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Label position
        </span>
        <select
          value={caption.labelPosition ?? "inherit"}
          onChange={(e) =>
            patchCaption({
              labelPosition: e.target.value as FormLabelPosition,
            })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          {LABEL_POSITIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.hint}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Description position
        </span>
        <select
          value={caption.descriptionPosition ?? "below"}
          onChange={(e) =>
            patchCaption({
              descriptionPosition: e.target.value as FormDescriptionPosition,
            })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          {DESCRIPTION_POSITIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.hint}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Placeholder mode
        </span>
        <select
          value={caption.placeholderMode ?? "inherit"}
          onChange={(e) =>
            patchCaption({
              placeholderMode: e.target.value as FormPlaceholderMode,
            })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          {PLACEHOLDER_MODES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} — {p.hint}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-[11.5px] font-semibold text-muted">
          Field align
        </span>
        <select
          value={caption.align ?? "stretch"}
          onChange={(e) =>
            patchCaption({ align: e.target.value as FormFieldAlign })
          }
          className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
        >
          {FIELD_ALIGNS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={Boolean(caption.sticky)}
          onChange={(e) => {
            const next = { ...caption };
            if (e.target.checked) next.sticky = true;
            else delete next.sticky;
            onPatch({ caption: normalizeCaption(next) });
          }}
        />
        Sticky while scrolling
      </label>
    </div>
  );
}
