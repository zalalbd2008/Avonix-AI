"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteForm, duplicateForm } from "@/lib/forms/create";
import { formShortcode } from "@/lib/forms/fields";

type Props = {
  clientId: string;
  websiteId: string;
  form: {
    id: string;
    formNumber: number;
    name: string;
    fieldCount: number;
    submissions: number;
    isPublished: boolean;
  };
};

const outlineBtn =
  "inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-[#dce3ee] bg-white px-3.5 text-[13px] font-medium text-[#1a2332] whitespace-nowrap outline-none hover:border-[#c5cedd] focus-visible:border-brand";

/**
 * Website Forms list row — matches the product row mock:
 * title · shortcode+copy · Published · Preview · Edit · ⋯
 */
export function FormListRow({ clientId, websiteId, form }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shortcode = formShortcode(form.formNumber);
  const editHref = `/clients/${clientId}/websites/${websiteId}/forms/${form.id}/edit`;
  const previewHref = `/clients/${clientId}/websites/${websiteId}/forms/${form.id}/preview`;
  const leadsHref = `/clients/${clientId}/forms/${form.id}`;

  const status =
    form.isPublished
      ? form.submissions > 0
        ? ({ label: "Live", tone: "live" } as const)
        : ({ label: "Published", tone: "published" } as const)
      : ({ label: "Draft", tone: "draft" } as const);

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) {
      setMenuPos(null);
      return;
    }
    function place() {
      const rect = triggerRef.current!.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    // Defer so the opening click doesn't immediately close the menu.
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function copyShortcode() {
    try {
      await navigator.clipboard.writeText(shortcode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function onDuplicate() {
    setMenuOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await duplicateForm({
        clientId,
        websiteId,
        formId: form.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(
        `/clients/${clientId}/websites/${websiteId}/forms/${result.formId}/edit` as never,
      );
      router.refresh();
    });
  }

  function onDelete() {
    setMenuOpen(false);
    if (!window.confirm(`Delete “${form.name}”? This cannot be undone from the list.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteForm({
        clientId,
        websiteId,
        formId: form.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const menu =
    menuOpen && menuPos
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-[100] min-w-[10.5rem] overflow-hidden rounded-xl border border-[#e8edf4] bg-white py-1 shadow-[0_10px_28px_rgba(19,35,60,.12)]"
          >
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={onDuplicate}
              className="flex w-full items-center px-3.5 py-2.5 text-left text-[13px] font-medium text-[#1a2332] hover:bg-[#f7f9fc] disabled:opacity-50"
            >
              Duplicate
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={onDelete}
              className="flex w-full items-center px-3.5 py-2.5 text-left text-[13px] font-medium text-bad hover:bg-[#fef2f2] disabled:opacity-50"
            >
              Delete
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="w-full rounded-2xl border border-[#e8edf4] bg-white px-5 py-6 shadow-[0_1px_2px_rgba(19,35,60,.04)]">
      <div className="flex w-full items-center gap-3">
        <div className="w-[9.5rem] shrink-0">
          <div className="truncate text-[15px] font-bold leading-tight tracking-[-0.01em] text-[#111827]">
            {form.name}
          </div>
          <div className="mt-1 truncate text-[12.5px] leading-none text-[#8b95a5]">
            {form.fieldCount} {form.fieldCount === 1 ? "field" : "fields"} ·{" "}
            {form.submissions}{" "}
            {form.submissions === 1 ? "submission" : "submissions"}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#f7f9fc] py-1.5 pr-1.5 pl-3.5">
          <code
            className="min-w-0 flex-1 truncate font-mono text-[12.5px] leading-none text-[#334155]"
            title={shortcode}
          >
            {shortcode}
          </code>
          <button
            type="button"
            onClick={() => void copyShortcode()}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#dce3ee] bg-white px-2.5 text-[12.5px] font-medium text-[#1a2332] outline-none hover:border-[#c5cedd] focus-visible:border-brand"
          >
            <CopyIcon />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap ${
              status.tone === "published"
                ? "bg-[#ecfdf5] text-[#059669]"
                : status.tone === "live"
                  ? "bg-[rgba(13,148,136,.1)] text-ok"
                  : "bg-[#f1f4f8] text-muted"
            }`}
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                status.tone === "published"
                  ? "bg-[#10b981]"
                  : status.tone === "live"
                    ? "bg-ok"
                    : "bg-[#c9d2de]"
              }`}
            />
            {status.label}
          </span>

          <Link href={previewHref as never} className={outlineBtn}>
            Preview
          </Link>

          <Link href={leadsHref as never} className={outlineBtn}>
            Leads
          </Link>

          <Link
            href={editHref as never}
            className="inline-flex h-9 shrink-0 items-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white whitespace-nowrap outline-none hover:bg-brand-dark focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            Edit
          </Link>

          <button
            ref={triggerRef}
            type="button"
            aria-label="More actions"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            disabled={pending}
            onClick={() => setMenuOpen((o) => !o)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#dce3ee] bg-white text-[#64748b] outline-none hover:border-[#c5cedd] hover:text-[#1a2332] focus-visible:border-brand disabled:opacity-50"
          >
            <MoreIcon />
          </button>
          {menu}
        </div>
      </div>
      {error ? <p className="mt-2 text-[12px] text-bad">{error}</p> : null}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}
