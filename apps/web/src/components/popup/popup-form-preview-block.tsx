"use client";

import { useEffect, useState } from "react";
import { FormPreviewClient } from "@/components/forms/form-preview-client";
import { actionGetPopupFormPreview } from "@/lib/popup/popup-actions";
import type { FormField, FormLayoutConfig, FormLogicConfig, FormStep } from "@/lib/db/schema";
import type { FormTheme } from "@/lib/forms/theme";

type Loaded = {
  name: string;
  fields: FormField[];
  steps: FormStep[];
  submitLabel: string;
  appearance: FormTheme;
  layout?: FormLayoutConfig;
  logic?: FormLogicConfig;
};

/**
 * Renders the real Form Builder form inside popup studio preview
 * (replaces the old dashed "Form · name" placeholder).
 */
export function PopupFormPreviewBlock({
  clientId,
  websiteId,
  formId,
  formName,
  hideSubmit,
}: {
  clientId: string;
  websiteId: string;
  formId: string;
  formName?: string;
  /** When popup uses its own CTA (replaceFormButtons). */
  hideSubmit?: boolean;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void actionGetPopupFormPreview({ clientId, websiteId, formId }).then(
      (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error);
          setLoading(false);
          return;
        }
        setData({
          name: res.name,
          fields: res.fields,
          steps: res.steps,
          submitLabel: res.submitLabel,
          appearance: res.appearance,
          layout: res.layout,
          logic: res.logic,
        });
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [clientId, websiteId, formId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-white/20 bg-black/5 px-3 py-5 text-center text-[11px] text-muted">
        Loading form…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-dashed border-bad/30 bg-red-50 px-3 py-4 text-center text-[11px] text-bad">
        {error || "Form could not load"}
        {formName ? ` · ${formName}` : ""}
      </div>
    );
  }

  return (
    <div
      className={`w-full min-w-0 avx-popup-form-preview ${hideSubmit ? "avx-popup-form-preview--no-submit" : ""}`}
    >
      <style>{`
        .avx-popup-form-preview--no-submit form button[type="submit"],
        .avx-popup-form-preview--no-submit .avx-submit,
        .avx-popup-form-preview--no-submit .avx-nav {
          display: none !important;
        }
      `}</style>
      <FormPreviewClient
        name={data.name}
        fields={data.fields}
        steps={data.steps}
        submitLabel={data.submitLabel}
        appearance={data.appearance}
        layout={data.layout}
        logic={data.logic}
        hideChrome
      />
    </div>
  );
}
