"use client";

import { useState, useTransition } from "react";
import { actionSavePopupAsTemplate } from "@/lib/popup/popup-actions";
import {
  POPUP_TEMPLATE_CATEGORIES,
  POPUP_TEMPLATE_SAVE_DESTINATIONS,
  canSaveDestination,
  type PopupTemplateSaveDestination,
} from "@/lib/popup/template-library";
import type {
  PopupCategory,
  PopupPayload,
  PopupType,
} from "@/lib/db/schema";

type Props = {
  open: boolean;
  onClose: () => void;
  role: "owner" | "admin" | "member";
  clientId: string;
  websiteId: string;
  snapshot: {
    name: string;
    type: PopupType;
    payload: PopupPayload;
    popupId?: string;
    category?: PopupCategory;
  };
  onSaved?: (templateId: string, meta: { name: string; type: PopupType }) => void;
};

/**
 * Save as Template for popups — same destinations as Form Builder (cloud + local).
 */
export function SavePopupTemplateDialog({
  open,
  onClose,
  role,
  clientId,
  websiteId,
  snapshot,
  onSaved,
}: Props) {
  const [name, setName] = useState(snapshot.name || "My popup template");
  const [description, setDescription] = useState("");
  const [destination, setDestination] =
    useState<PopupTemplateSaveDestination>("organization");
  const [category, setCategory] = useState<PopupCategory>(
    snapshot.category ?? snapshot.payload.category ?? "custom",
  );
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await actionSavePopupAsTemplate({
        popupId: snapshot.popupId,
        clientId,
        websiteId,
        name,
        description,
        type: snapshot.type,
        category,
        tagsRaw,
        payload: snapshot.payload,
        destination,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved?.(result.id, { name: name.trim(), type: snapshot.type });
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
            P
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
              {POPUP_TEMPLATE_SAVE_DESTINATIONS.map((d) => {
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
                      name="popup-tpl-dest"
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
                            ? "Open Popup Studio from a website to use this option."
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
                  setCategory(e.target.value as PopupCategory)
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              >
                {POPUP_TEMPLATE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
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
                placeholder="welcome, lead, exit"
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
