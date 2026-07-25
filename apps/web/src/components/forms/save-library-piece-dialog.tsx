"use client";

import { useState, useTransition } from "react";
import type { FormField } from "@/lib/db/schema";
import {
  actionSaveFormComponent,
  actionSaveFormSection,
} from "@/lib/forms/org-asset-actions";

type Kind = "component" | "section";

type Props = {
  open: boolean;
  kind: Kind;
  onClose: () => void;
  fields: FormField[];
  defaultName?: string;
  clientId?: string | null;
  websiteId?: string | null;
  onSaved?: (id: string) => void;
};

/**
 * Save current form fields as a reusable Component or Section (ADR-007 Step 5).
 */
export function SaveLibraryPieceDialog({
  open,
  kind,
  onClose,
  fields,
  defaultName = "",
  clientId,
  websiteId,
  onSaved,
}: Props) {
  const [name, setName] = useState(
    defaultName || (kind === "section" ? "My section" : "My component"),
  );
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        name,
        description,
        fields,
        tagsRaw,
        clientId,
        websiteId,
      };
      const result =
        kind === "section"
          ? await actionSaveFormSection(payload)
          : await actionSaveFormComponent(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved?.(result.id);
      onClose();
    });
  }

  const title = kind === "section" ? "Save as Section" : "Save as Component";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#13233c]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-[12px] font-semibold text-muted hover:text-brand"
          >
            Close
          </button>
        </div>
        <p className="mb-3 text-[12.5px] text-muted">
          Saves {fields.length} field{fields.length === 1 ? "" : "s"} into the
          organization cloud library for reuse across forms.
        </p>
        <label className="mb-2 block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
          />
        </label>
        <label className="mb-2 block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
          />
        </label>
        <label className="mb-3 block">
          <span className="mb-1 block text-[11.5px] font-semibold text-muted">
            Tags (comma-separated)
          </span>
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px]"
            placeholder="contact, lead"
          />
        </label>
        {error ? (
          <p className="mb-2 text-[12.5px] font-medium text-bad">{error}</p>
        ) : null}
        <button
          type="button"
          disabled={pending || !name.trim() || fields.length === 0}
          onClick={submit}
          className="w-full rounded-lg bg-brand py-2.5 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save to organization library"}
        </button>
      </div>
    </div>
  );
}
