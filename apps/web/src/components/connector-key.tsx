"use client";

import { useState } from "react";

/**
 * Shows a connector key once, and says so.
 *
 * Only the hash is stored, so this really is the only time it can be displayed.
 * The warning is not decoration — without it people close the page and then ask
 * support to resend a key that does not exist anywhere.
 */
export function ConnectorKeyPanel({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-[#ffd9bd] bg-[#fff8f3] p-4">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold">Your connector key</span>
        <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
          shown once
        </span>
      </div>
      <p className="mt-1 text-[12.5px] text-muted">
        Copy this into the Avonix plugin now. We only store a hash of it, so it
        cannot be shown again — if it is lost, rotate for a new one.
      </p>
      <div className="mt-3 flex gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-[12.5px]">
          {value}
        </code>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
          className="shrink-0 cursor-pointer rounded-lg bg-brand px-4 text-[13px] font-semibold text-white hover:bg-brand-dark"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
