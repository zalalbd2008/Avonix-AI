"use client";

import { useState } from "react";

/**
 * A block of code with a copy button.
 *
 * The copy is the point — nobody retypes an embed snippet by hand, and a
 * snippet with one character wrong fails silently at the far end.
 */
export function CopyBlock({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard is blocked (insecure origin, or the user said no). The
            // text is selectable, so leaving the label alone is honest.
            setCopied(false);
          }
        }}
        className="absolute top-2.5 right-2.5 cursor-pointer rounded-md border border-[#dbe1ea] bg-white px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
      >
        {copied ? "Copied" : (label ?? "Copy")}
      </button>
      <pre className="overflow-x-auto rounded-lg border border-line bg-[#fbfcfe] px-3.5 py-3 pr-20 font-mono text-[12px] leading-[1.65]">
        {value}
      </pre>
    </div>
  );
}
