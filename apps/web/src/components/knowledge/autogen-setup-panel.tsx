"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  actionApplyAutogen,
  actionAutogenWebsite,
} from "@/lib/ai/actions";
import type { AutogenPreview } from "@/lib/ai/autogen";

type Status = { ok: boolean; message: string } | null;

export function AutoSetupPanel({
  clientId,
  websiteId,
  websiteName,
  onApplied,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  /** Called after apply so parent can sync local payload state. */
  onApplied?: (preview: AutogenPreview) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<AutogenPreview | null>(null);
  const [status, setStatus] = useState<Status>(null);

  async function analyze() {
    setLoading(true);
    setStatus(null);
    const result = await actionAutogenWebsite({ clientId, websiteId });
    setLoading(false);
    if (!result.ok) {
      setStatus({ ok: false, message: result.error });
      return;
    }
    setPreview(result.preview);
    setStatus({
      ok: true,
      message: `Analyzed ${websiteName} — review suggestions below, then Apply.`,
    });
  }

  async function apply(trainAfter: boolean) {
    if (!preview) return;
    setApplying(true);
    setStatus(null);
    const result = await actionApplyAutogen({
      clientId,
      websiteId,
      preview,
      trainAfter,
    });
    setApplying(false);
    if (!result.ok) {
      setStatus({ ok: false, message: result.error });
      return;
    }
    setStatus({
      ok: true,
      message: trainAfter
        ? "Applied to chat widget and started training."
        : "Applied to chat widget. Run Train Now to refresh knowledge.",
    });
    onApplied?.(preview);
    router.refresh();
  }

  const busy = loading || applying;

  return (
    <div className="rounded-xl border border-[#dbeafe] bg-[#f0f7ff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-ink">Auto-Setup</p>
          <p className="mt-1 max-w-xl text-[12px] leading-[1.55] text-muted">
            Crawl the site, then AI proposes business type, summary, system prompt,
            FAQ chips, and quick actions — like Nexus Auto-Setup.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={analyze}
          className="cursor-pointer rounded-xl bg-[#2563eb] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {loading ? "Analyzing…" : "Analyze website"}
        </button>
      </div>

      {status ? (
        <div
          className={`mt-3 rounded-xl border px-4 py-3 text-[12px] font-semibold ${
            status.ok
              ? "border-ok/25 bg-ok/5 text-ok"
              : "border-bad/25 bg-[#fef2f2] text-bad"
          }`}
        >
          {status.message}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-4 space-y-4 rounded-xl border border-line bg-white p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              Business type
            </p>
            <p className="mt-1 text-[13px] font-medium text-ink">
              {preview.businessType}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              Summary
            </p>
            <p className="mt-1 text-[13px] leading-[1.55] text-muted">
              {preview.summary || "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
              System prompt
            </p>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[#f7f8fb] p-3 text-[11.5px] leading-[1.5] text-ink">
              {preview.systemPrompt || "—"}
            </pre>
          </div>
          {preview.faqs.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                FAQ chips ({preview.faqs.length})
              </p>
              <ul className="mt-2 space-y-2">
                {preview.faqs.map((f, i) => (
                  <li
                    key={`${f.label}-${i}`}
                    className="rounded-lg border border-line bg-[#fafbfc] px-3 py-2 text-[12px]"
                  >
                    <p className="font-semibold text-ink">{f.label}</p>
                    <p className="mt-0.5 text-muted">{f.a}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {preview.actions.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
                Quick actions
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {preview.actions.map((a, i) => (
                  <span
                    key={`${a.label}-${i}`}
                    className="rounded-full bg-[#eef2f7] px-3 py-1 text-[12px] font-medium text-ink"
                  >
                    {a.label}{" "}
                    <span className="text-faint">({a.action})</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => apply(true)}
              className="cursor-pointer rounded-xl bg-brand px-4 py-2.5 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {applying ? "Applying…" : "Apply + Train Now"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => apply(false)}
              className="cursor-pointer rounded-xl border-[1.5px] border-[#dbe1ea] px-4 py-2.5 text-[13px] font-bold text-muted hover:border-brand hover:text-brand disabled:opacity-60"
            >
              Apply only
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
