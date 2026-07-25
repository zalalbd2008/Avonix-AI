"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormIcon } from "@/components/forms/icons";
import type { LibraryImportStrategy } from "@/lib/forms/library-package";
import { actionManualSyncSnapshot } from "@/lib/forms/library-transfer-actions";

type Props = {
  currentRole: "owner" | "admin" | "member";
};

/**
 * Export / import ZIP + manual sync controls for the org cloud library.
 */
export function LibraryTransferPanel({ currentRole }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [strategy, setStrategy] = useState<LibraryImportStrategy>("duplicate");
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const canOverwrite = currentRole === "owner" || currentRole === "admin";

  function exportZip() {
    window.location.href = "/api/templates/export";
  }

  function exportJson() {
    window.location.href = "/api/templates/export?format=json";
  }

  async function onFile(file: File) {
    setMsg(null);
    setPreview(null);
    const body = new FormData();
    body.set("file", file);
    body.set("strategy", strategy);
    body.set("preview", "1");

    startTransition(async () => {
      const prevRes = await fetch("/api/templates/import", {
        method: "POST",
        body,
      });
      const prevJson = (await prevRes.json()) as {
        ok?: boolean;
        error?: string;
        summary?: string;
        counts?: {
          templates: number;
          components: number;
          sections: number;
          assets: number;
        };
      };
      if (!prevRes.ok || !prevJson.ok) {
        setMsg(prevJson.error ?? "Could not read package.");
        return;
      }
      const counts = prevJson.counts;
      const countLine = counts
        ? `${counts.templates} templates · ${counts.components} components · ${counts.sections} sections · ${counts.assets} assets`
        : "";
      setPreview(`${prevJson.summary ?? "Ready"}${countLine ? ` — ${countLine}` : ""}`);

      if (
        !window.confirm(
          `Import this package?\n${prevJson.summary}\nStrategy: ${strategy}`,
        )
      ) {
        return;
      }

      const body2 = new FormData();
      body2.set("file", file);
      body2.set("strategy", strategy);
      const res = await fetch("/api/templates/import", {
        method: "POST",
        body: body2,
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        created?: number;
        updated?: number;
        skipped?: number;
        duplicated?: number;
        summary?: string;
        errors?: string[];
      };
      if (!res.ok || !json.ok) {
        setMsg(json.error ?? "Import failed.");
        return;
      }
      setMsg(
        `Imported — created ${json.created ?? 0}, updated ${json.updated ?? 0}, duplicated ${json.duplicated ?? 0}, skipped ${json.skipped ?? 0}.`,
      );
      if (json.errors?.length) {
        setMsg((m) => `${m} Warnings: ${json.errors!.slice(0, 3).join("; ")}`);
      }
      router.refresh();
    });
  }

  function runSync() {
    setMsg(null);
    startTransition(async () => {
      const r = await actionManualSyncSnapshot();
      if (!r.ok) return;
      setMsg(
        `Sync snapshot · ${r.counts.templates} templates · ${r.counts.components} components · ${r.counts.sections} sections · ${r.counts.assets} assets · ${r.note}`,
      );
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-[#edf0f5] bg-white px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff8f3] text-brand">
          <FormIcon name="pack" size="sm" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#13233c]">
            Transfer & sync
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Export a ZIP backup of this org library, or import a package with
            conflict detection (skip / duplicate / overwrite).
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportZip}
              className="rounded-lg border border-brand/30 bg-[#fff8f3] px-3 py-1.5 text-[12.5px] font-semibold text-brand hover:border-brand"
            >
              Export ZIP
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
            >
              Export JSON
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
            >
              Import package…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".zip,.json,application/zip,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
            <label className="inline-flex items-center gap-1.5 text-[12px] text-muted">
              On conflict
              <select
                value={strategy}
                onChange={(e) =>
                  setStrategy(e.target.value as LibraryImportStrategy)
                }
                className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[12px]"
              >
                <option value="duplicate">Duplicate</option>
                <option value="skip">Skip</option>
                <option value="overwrite" disabled={!canOverwrite}>
                  Overwrite{canOverwrite ? "" : " (admin)"}
                </option>
              </select>
            </label>
            <button
              type="button"
              disabled={pending}
              onClick={runSync}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
            >
              Manual sync check
            </button>
          </div>
          {preview ? (
            <p className="mt-2 text-[12px] text-muted">Preview: {preview}</p>
          ) : null}
          {msg ? (
            <p className="mt-2 text-[12.5px] text-brand">{msg}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
