"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CepAiProvider } from "@/lib/db/schema";
import { actionSavePlatformAiKeys } from "@/lib/platform/ai-keys-actions";
import {
  PLATFORM_AI_KEY_PROVIDERS,
  type AiKeyStatus,
} from "@/lib/platform/ai-keys-shared";

type Props = {
  statuses: AiKeyStatus[];
};

/**
 * Platform Owner form — set / clear AI provider API keys (encrypted at rest).
 */
export function PlatformAiKeysForm({ statuses }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Partial<Record<CepAiProvider, string>>>(
    () => {
      const init: Partial<Record<CepAiProvider, string>> = {};
      for (const s of statuses) {
        if (s.inDb) init[s.provider] = "••••••••••••";
      }
      return init;
    },
  );
  const [clearFlags, setClearFlags] = useState<
    Partial<Record<CepAiProvider, boolean>>
  >({});

  function onSave() {
    setMsg(null);
    setError(null);
    start(async () => {
      const keys: Partial<Record<CepAiProvider, string>> = {};
      for (const p of PLATFORM_AI_KEY_PROVIDERS) {
        if (clearFlags[p.id]) {
          keys[p.id] = "";
          continue;
        }
        const v = (values[p.id] ?? "").trim();
        if (!v || v.includes("•")) continue; // unchanged mask
        keys[p.id] = v;
      }
      if (Object.keys(keys).length === 0) {
        setError("Enter a new key, or mark one to clear.");
        return;
      }
      const res = await actionSavePlatformAiKeys({ keys });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMsg("API keys saved.");
      setClearFlags({});
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-white p-4">
        <p className="text-[13.5px] font-semibold text-ink">AI provider keys</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Keys are encrypted in the database. Live Chat uses these first; if
          empty, it falls back to server env (
          <code className="text-[11px]">OPENROUTER_API_KEY</code>, etc.).
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {PLATFORM_AI_KEY_PROVIDERS.map((p) => {
          const st = statuses.find((s) => s.provider === p.id);
          const source = st?.source ?? "none";
          return (
            <div
              key={p.id}
              className="border-b border-[#f1f4f8] px-4 py-3.5 last:border-0"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">
                  {p.label}
                </span>
                <SourceBadge source={source} />
                <span className="text-[11px] text-faint">{p.envHint}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="password"
                  autoComplete="off"
                  disabled={pending || Boolean(clearFlags[p.id])}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-[#fafbfd] px-3 py-2 text-[13px] outline-none focus:border-brand"
                  placeholder={
                    st?.inDb
                      ? "Leave masked to keep · paste new key to replace"
                      : p.placeholder
                  }
                  value={clearFlags[p.id] ? "" : (values[p.id] ?? "")}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [p.id]: e.target.value,
                    }))
                  }
                  onFocus={() => {
                    const cur = values[p.id] ?? "";
                    if (cur.includes("•")) {
                      setValues((prev) => ({ ...prev, [p.id]: "" }));
                    }
                  }}
                />
                <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-muted">
                  <input
                    type="checkbox"
                    checked={Boolean(clearFlags[p.id])}
                    disabled={pending || !st?.inDb}
                    onChange={(e) =>
                      setClearFlags((prev) => ({
                        ...prev,
                        [p.id]: e.target.checked,
                      }))
                    }
                  />
                  Clear saved key
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className="text-[13px] text-red-600">{error}</p>
      ) : null}
      {msg ? (
        <p className="text-[13px] text-emerald-700">{msg}</p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={onSave}
        className="rounded-lg bg-navy px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save API keys"}
      </button>
    </div>
  );
}

function SourceBadge({ source }: { source: "platform" | "env" | "none" }) {
  if (source === "platform") {
    return (
      <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
        Platform
      </span>
    );
  }
  if (source === "env") {
    return (
      <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
        Env fallback
      </span>
    );
  }
  return (
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
      Not set
    </span>
  );
}
