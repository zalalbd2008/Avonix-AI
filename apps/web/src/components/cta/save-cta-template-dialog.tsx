"use client";

import { useState, useTransition } from "react";
import { actionSaveCtaButtonAsTemplate } from "@/lib/cta/cta-actions";
import {
  TEMPLATE_SAVE_DESTINATIONS,
  canSaveDestination,
  type TemplateSaveDestination,
} from "@/lib/forms/template-library";
import type { CtaButtonPayload, CtaTemplateCategory } from "@/lib/db/schema";

const CTA_TEMPLATE_CATEGORIES: { id: CtaTemplateCategory; label: string }[] = [
  { id: "call", label: "Call / Phone" },
  { id: "chat", label: "Chat" },
  { id: "form", label: "Form" },
  { id: "link", label: "Link / URL" },
  { id: "social", label: "Social" },
  { id: "offer", label: "Offer" },
  { id: "other", label: "Other" },
];

const DESTINATIONS = TEMPLATE_SAVE_DESTINATIONS.map((d) =>
  d.id === "website"
    ? { ...d, hint: "Visible on this website’s button library" }
    : d,
);

type Props = {
  open: boolean;
  onClose: () => void;
  role: "owner" | "admin" | "member";
  clientId: string;
  websiteId: string;
  snapshot: {
    name: string;
    payload: CtaButtonPayload;
    buttonId?: string;
    category?: CtaTemplateCategory;
  };
  onSaved?: (templateId: string, meta: { name: string }) => void;
};

/** Save as Template for Button Studio — same destinations as forms/popups. */
export function SaveCtaTemplateDialog({
  open,
  onClose,
  role,
  clientId,
  websiteId,
  snapshot,
  onSaved,
}: Props) {
  const [name, setName] = useState(snapshot.name || "My button template");
  const [description, setDescription] = useState("");
  const [destination, setDestination] =
    useState<TemplateSaveDestination>("organization");
  const [category, setCategory] = useState<CtaTemplateCategory>(
    snapshot.category ?? "other",
  );
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await actionSaveCtaButtonAsTemplate({
        buttonId: snapshot.buttonId,
        clientId,
        websiteId,
        name,
        description,
        category,
        tagsRaw,
        payload: snapshot.payload,
        destination,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved?.(result.id, { name: name.trim() });
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Save as template"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_64px_rgba(11,30,58,.28)]">
        <div className="flex items-center gap-2 border-b border-[#edf0f5] px-4 py-3">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand/10 text-[12px] font-bold text-brand">
            B
          </span>
          <h2 className="text-sm font-semibold text-[#13233c]">
            Save as Template
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg border border-[#dbe1ea] px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Template name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[11.5px] font-semibold text-muted">
              Save to
            </span>
            <div className="flex flex-col gap-1.5">
              {DESTINATIONS.map((d) => {
                const allowed = canSaveDestination(d.id, role);
                const needsSite = d.id === "website" && !websiteId;
                const disabled = !allowed || needsSite || pending;
                return (
                  <label
                    key={d.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                      destination === d.id
                        ? "border-brand bg-[#fff8f3]"
                        : "border-[#edf0f5] bg-white"
                    } ${disabled ? "opacity-45" : ""}`}
                  >
                    <input
                      type="radio"
                      name="cta-tpl-dest"
                      className="mt-1"
                      checked={destination === d.id}
                      disabled={disabled}
                      onChange={() => setDestination(d.id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-[#13233c]">
                        {d.label}
                      </span>
                      <span className="block text-[11.5px] text-faint">
                        {!allowed
                          ? "Requires admin or owner."
                          : needsSite
                            ? "Open Button Studio from a website to use this option."
                            : d.hint}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Category
              </span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as CtaTemplateCategory)
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                {CTA_TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Tags
              </span>
              <input
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="call, footer, chat"
                className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
          </div>

          {error ? (
            <p className="rounded-lg border border-[#fecdca] bg-[#fef2f2] px-2.5 py-2 text-[12.5px] text-bad">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-[#edf0f5] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#dbe1ea] py-2 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !name.trim()}
            onClick={submit}
            className="flex-1 rounded-lg bg-brand py-2 text-[13px] font-semibold text-white hover:brightness-95 disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}
