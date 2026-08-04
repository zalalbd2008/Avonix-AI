"use client";

import { parseFaqPaste } from "@/lib/knowledge/faq-parse";
import type { CepWidgetPayload } from "@/lib/db/schema";

export function FaqPasteEditor({
  payload,
  onChange,
}: {
  payload: CepWidgetPayload;
  onChange: (next: CepWidgetPayload) => void;
}) {
  const paste = payload.faq?.paste ?? "";
  const enabled = payload.faq?.enabled !== false;
  const parsed = parseFaqPaste(paste);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            onChange({
              ...payload,
              faq: {
                ...payload.faq,
                enabled: e.target.checked,
                paste,
                items: parsed.map((item) => ({
                  id: item.id,
                  label: item.label,
                  answer: item.answer,
                })),
              },
            })
          }
        />
        Show FAQ quick-replies in chat
      </label>
      <textarea
        value={paste}
        onChange={(e) => {
          const nextPaste = e.target.value;
          const items = parseFaqPaste(nextPaste);
          onChange({
            ...payload,
            faq: {
              ...payload.faq,
              enabled,
              paste: nextPaste,
              items: items.map((item) => ({
                id: item.id,
                label: item.label,
                answer: item.answer,
              })),
            },
          });
        }}
        rows={6}
        placeholder={`Q: What are your hours?\nA: Mon–Fri 9–5.\n\nQ: What is your refund policy?\nA: 30-day money-back guarantee on annual plans.`}
        className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 font-mono text-[12px] leading-relaxed outline-none focus:border-brand"
      />
      <p className="text-[12px] text-muted">
        Included in training alongside your site crawl. Save the widget, then
        click Train Now. Answers with text show instantly in chat (no AI call).
      </p>
      {parsed.length > 0 ? (
        <p className="text-[12px] font-medium text-ink">
          {parsed.length} FAQ {parsed.length === 1 ? "item" : "items"} parsed
        </p>
      ) : null}
    </div>
  );
}
