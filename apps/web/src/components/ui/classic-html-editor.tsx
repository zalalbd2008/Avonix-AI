"use client";

import { useEffect, useId, useRef } from "react";

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "DIV",
  "SPAN",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "A",
  "H1",
  "H2",
  "H3",
  "H4",
  "UL",
  "OL",
  "LI",
  "FONT",
]);

/** Strip scripts/events; keep basic formatting + links + inline color. */
export function sanitizeAgreementHtml(raw: string): string {
  if (typeof window === "undefined") {
    return String(raw || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  }
  const wrap = document.createElement("div");
  wrap.innerHTML = String(raw || "");
  const walk = (node: Node) => {
    const kids = Array.from(node.childNodes);
    for (const child of kids) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          while (el.firstChild) node.insertBefore(el.firstChild, el);
          node.removeChild(el);
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (name.startsWith("on") || name === "srcdoc") {
            el.removeAttribute(attr.name);
            continue;
          }
          if (el.tagName === "A" && name === "href") {
            const href = attr.value.trim();
            if (/^javascript:/i.test(href)) el.removeAttribute("href");
            else {
              el.setAttribute("target", "_blank");
              el.setAttribute("rel", "noopener noreferrer");
            }
            continue;
          }
          if (name === "style") {
            const safe = attr.value
              .replace(/expression\s*\(/gi, "")
              .replace(/url\s*\(\s*['"]?\s*javascript:/gi, "")
              .replace(/position\s*:/gi, "")
              .replace(/behavior\s*:/gi, "");
            el.setAttribute("style", safe);
            continue;
          }
          if (el.tagName === "FONT" && (name === "color" || name === "size")) {
            continue;
          }
          if (
            name !== "href" &&
            name !== "style" &&
            name !== "target" &&
            name !== "rel"
          ) {
            el.removeAttribute(attr.name);
          }
        }
        walk(el);
      } else if (child.nodeType === Node.COMMENT_NODE) {
        node.removeChild(child);
      }
    }
  };
  walk(wrap);
  return wrap.innerHTML;
}

export function defaultAgreementHtml(opts?: {
  brand?: string;
  intro?: string;
  body?: string;
}): string {
  const brand = opts?.brand || "Customer Support";
  const intro = opts?.intro || "Hi! I am your virtual agent.";
  const body =
    opts?.body ||
    "I'm happy to help find what you need. To continue, you will need to agree to our Terms Of Use and Privacy Policy.";
  return (
    `<p style="margin:0 0 18px;font-size:23px;font-weight:700;font-family:Georgia,'Times New Roman',Times,serif;color:#0f172a;letter-spacing:-0.025em;line-height:1.2;">${escapeText(brand)}</p>` +
    `<p style="margin:0 0 12px;font-size:14.5px;font-weight:600;color:#0f172a;line-height:1.45;">${escapeText(intro)}</p>` +
    `<p style="margin:0;font-size:13.5px;font-weight:400;color:#64748b;line-height:1.55;">${escapeText(body)}</p>`
  );
}

function escapeText(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type ClassicHtmlEditorProps = {
  label: string;
  value: string;
  onChange: (html: string) => void;
  hint?: string;
  className?: string;
  minHeight?: number;
};

/**
 * Lightweight classic (contentEditable) editor: bold / italic / underline,
 * text color, and links — no extra npm dependency.
 */
export function ClassicHtmlEditor({
  label,
  value,
  onChange,
  hint,
  className,
  minHeight = 160,
}: ClassicHtmlEditorProps) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef(value);
  const seeded = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!seeded.current) {
      el.innerHTML = value || "";
      seeded.current = true;
      lastEmitted.current = value;
      return;
    }
    if (value !== lastEmitted.current && el.innerHTML !== value) {
      el.innerHTML = value || "";
      lastEmitted.current = value;
    }
  }, [value]);

  function run(cmd: string, arg?: string) {
    ref.current?.focus();
    try {
      document.execCommand(cmd, false, arg);
    } catch {
      /* ignore */
    }
    emit();
  }

  function emit() {
    const el = ref.current;
    if (!el) return;
    const html = sanitizeAgreementHtml(el.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  }

  function onLink() {
    const url = window.prompt("Link URL", "https://");
    if (url == null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      run("unlink");
      return;
    }
    run("createLink", trimmed);
  }

  const btn =
    "rounded border border-line bg-white px-2 py-1 text-[12px] font-semibold text-ink hover:bg-[#f8fafc] disabled:opacity-40";

  return (
    <div className={className}>
      <span className="text-[12px] font-medium">{label}</span>
      <div className="mt-1 overflow-hidden rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center gap-1 border-b border-line bg-[#f8fafc] px-2 py-1.5">
          <button
            type="button"
            className={btn}
            title="Bold"
            onMouseDown={(e) => {
              e.preventDefault();
              run("bold");
            }}
          >
            <b>B</b>
          </button>
          <button
            type="button"
            className={btn}
            title="Italic"
            onMouseDown={(e) => {
              e.preventDefault();
              run("italic");
            }}
          >
            <i>I</i>
          </button>
          <button
            type="button"
            className={btn}
            title="Underline"
            onMouseDown={(e) => {
              e.preventDefault();
              run("underline");
            }}
          >
            <span className="underline">U</span>
          </button>
          <span className="mx-1 h-4 w-px bg-line" />
          <label
            className={`${btn} inline-flex cursor-pointer items-center gap-1`}
            title="Text color"
          >
            <span>A</span>
            <input
              type="color"
              className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              defaultValue="#0f172a"
              onMouseDown={(e) => e.stopPropagation()}
              onChange={(e) => run("foreColor", e.target.value)}
            />
          </label>
          <button
            type="button"
            className={btn}
            title="Insert link"
            onMouseDown={(e) => {
              e.preventDefault();
              onLink();
            }}
          >
            Link
          </button>
          <button
            type="button"
            className={btn}
            title="Remove link"
            onMouseDown={(e) => {
              e.preventDefault();
              run("unlink");
            }}
          >
            Unlink
          </button>
          <span className="mx-1 h-4 w-px bg-line" />
          <button
            type="button"
            className={btn}
            title="Clear formatting"
            onMouseDown={(e) => {
              e.preventDefault();
              run("removeFormat");
            }}
          >
            Clear
          </button>
        </div>
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-label={label}
          contentEditable
          suppressContentEditableWarning
          className="px-3 py-2.5 text-[13px] text-ink outline-none focus:ring-2 focus:ring-inset focus:ring-brand/15 [&_a]:text-brand [&_a]:underline"
          style={{ minHeight }}
          onInput={emit}
          onBlur={emit}
        />
      </div>
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}
