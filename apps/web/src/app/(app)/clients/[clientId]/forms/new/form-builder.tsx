"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import type { FormField } from "@/lib/db/schema";
import { CONTACT_KEYS, DEFAULT_FIELDS } from "@/lib/forms/fields";
import { createForm } from "@/lib/forms/create";

const TYPES: FormField["type"][] = ["text", "email", "phone", "textarea", "select", "checkbox"];

/**
 * A field list, not a drag-and-drop canvas (BACKLOG §4).
 *
 * The canvas is the trap: weeks of work on drag handles and snap guides for a
 * form that is four fields long. Adding, removing and reordering with buttons
 * covers every real form, and took an afternoon.
 */
export function FormBuilder({
  clientId,
  websites,
}: {
  clientId: string;
  websites: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update(i: number, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f, n) => (n === i ? { ...f, ...patch } : f)));
  }

  function move(i: number, by: number) {
    const to = i + by;
    if (to < 0 || to >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });
  }

  function add() {
    setFields((prev) => [
      ...prev,
      { key: `field_${prev.length + 1}`, label: "New field", type: "text", required: false },
    ]);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(e.currentTarget);
    const result = await createForm({
      clientId,
      name: String(data.get("name") ?? ""),
      websiteId: String(data.get("websiteId") ?? "") || undefined,
      submitLabel: String(data.get("submitLabel") ?? ""),
      successMessage: String(data.get("successMessage") ?? ""),
      fields,
    });

    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(`/clients/${clientId}/forms/${result.formId}` as never);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl">
      <FormError message={error} />

      <section className="mb-4 rounded-xl border border-line bg-white p-5">
        <Field label="Form name" name="name" required autoFocus placeholder="Contact us" />

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[12.5px] font-semibold">Website</span>
          <select
            name="websiteId"
            defaultValue=""
            className="w-full rounded-lg border border-[#dbe1ea] bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">Any of this client&apos;s websites</option>
            {websites.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <span className="mt-1 block text-[12px] text-faint">
            Only used for reporting — submissions are accepted from whichever site
            posts them.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button text" name="submitLabel" defaultValue="Send" />
          <Field
            label="Message after sending"
            name="successMessage"
            defaultValue="Thanks — we'll be in touch."
          />
        </div>
      </section>

      <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center gap-3 border-b border-[#edf0f5] px-4 py-3">
          <h2 className="text-sm font-semibold">Fields</h2>
          <button
            type="button"
            onClick={add}
            className="ml-auto rounded-lg border border-[#dbe1ea] px-2.5 py-1.5 text-[12.5px] font-semibold hover:border-brand hover:text-brand"
          >
            Add field
          </button>
        </div>

        {fields.map((f, i) => (
          <div key={i} className="border-b border-[#f1f4f8] px-4 py-3 last:border-0">
            <div className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-[1.4fr_1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-muted">Label</span>
                <input
                  value={f.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="w-full rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11.5px] font-semibold text-muted">Type</span>
                <select
                  value={f.type}
                  onChange={(e) => update(i, { type: e.target.value as FormField["type"] })}
                  className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <div className="flex items-center gap-1 pb-1">
                <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>↑</IconButton>
                <IconButton label="Move down" onClick={() => move(i, 1)} disabled={i === fields.length - 1}>↓</IconButton>
                <IconButton
                  label="Remove"
                  onClick={() => setFields((p) => p.filter((_, n) => n !== i))}
                  disabled={fields.length === 1}
                >
                  ×
                </IconButton>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
                Required
              </label>

              <label className="flex items-center gap-1.5 text-[12.5px] text-muted">
                <span>Key</span>
                <input
                  value={f.key}
                  onChange={(e) => update(i, { key: e.target.value })}
                  className="w-32 rounded border border-[#e4e9f0] px-1.5 py-0.5 font-mono text-[12px] outline-none focus:border-brand"
                />
              </label>

              {CONTACT_KEYS.has(f.key) ? (
                <span className="text-[12px] text-ok">Saved to the contact record</span>
              ) : (
                <span className="text-[12px] text-faint">Saved as extra data</span>
              )}

              {f.type === "select" && (
                <label className="flex flex-1 items-center gap-1.5 text-[12.5px] text-muted">
                  <span className="shrink-0">Options</span>
                  <input
                    value={(f.options ?? []).join(", ")}
                    onChange={(e) =>
                      update(i, {
                        options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean),
                      })
                    }
                    placeholder="One, Two, Three"
                    className="min-w-0 flex-1 rounded border border-[#e4e9f0] px-1.5 py-0.5 text-[12px] outline-none focus:border-brand"
                  />
                </label>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <div className="w-40">
          <SubmitButton pending={pending}>Create form</SubmitButton>
        </div>
        <Link
          href={`/clients/${clientId}/forms` as never}
          className="text-[13px] font-medium text-muted hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-7 place-items-center rounded-md border border-[#dbe1ea] text-[13px] text-muted hover:border-brand hover:text-brand disabled:opacity-35 disabled:hover:border-[#dbe1ea] disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}
