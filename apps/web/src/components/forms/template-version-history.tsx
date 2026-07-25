"use client";

import { useEffect, useState, useTransition } from "react";
import { FormIcon } from "@/components/forms/icons";
import {
  actionCompareTemplateVersions,
  actionDuplicateTemplateVersion,
  actionListTemplateVersions,
  actionPublishTemplateVersion,
  actionRestoreTemplateVersion,
} from "@/lib/forms/template-actions";
import { formatTemplateVersion } from "@/lib/forms/template-version";
import type {
  TemplateVersionDiff,
  TemplateVersionListItem,
} from "@/lib/forms/template-version";

type Props = {
  templateId: string;
  templateName: string;
  open: boolean;
  onClose: () => void;
  onChanged: (msg: string) => void;
};

/**
 * Version history panel — list, compare, restore, duplicate (ADR-007 Step 2).
 */
export function TemplateVersionHistory({
  templateId,
  templateName,
  open,
  onClose,
  onChanged,
}: Props) {
  const [versions, setVersions] = useState<TemplateVersionListItem[]>([]);
  const [currentVersion, setCurrentVersion] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [diff, setDiff] = useState<{
    versionA: number;
    versionB: number;
    diff: TemplateVersionDiff;
  } | null>(null);
  const [changelog, setChangelog] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDiff(null);
    setSelected([]);
    startTransition(async () => {
      const result = await actionListTemplateVersions(templateId);
      if (!result.ok) {
        setError(result.error);
        setVersions([]);
        return;
      }
      setVersions(result.versions);
      setCurrentVersion(result.currentVersion);
    });
  }, [open, templateId]);

  if (!open) return null;

  function toggle(version: number) {
    setSelected((prev) => {
      if (prev.includes(version)) return prev.filter((v) => v !== version);
      if (prev.length >= 2) return [prev[1]!, version];
      return [...prev, version];
    });
    setDiff(null);
  }

  function refresh() {
    startTransition(async () => {
      const result = await actionListTemplateVersions(templateId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setVersions(result.versions);
      setCurrentVersion(result.currentVersion);
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(11,30,58,.45)] p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Version history"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[min(92vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_64px_rgba(11,30,58,.28)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f5] px-4 py-3">
          <FormIcon name="workflow" size="sm" className="text-brand" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-[#13233c]">
              Version history
            </h2>
            <p className="truncate text-[12px] text-faint">
              {templateName} · current {formatTemplateVersion(currentVersion)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#dbe1ea] px-2.5 py-1 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div className="rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
            <p className="mb-2 text-[11.5px] font-semibold text-muted">
              Publish new version (snapshot current head)
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="Change log (optional)"
                className="min-w-[12rem] flex-1 rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-brand"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setError(null);
                  startTransition(async () => {
                    const result = await actionPublishTemplateVersion({
                      templateId,
                      changelog: changelog.trim() || undefined,
                    });
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    setChangelog("");
                    onChanged(
                      `Published ${formatTemplateVersion(result.version ?? currentVersion + 1)}.`,
                    );
                    refresh();
                  });
                }}
                className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
              >
                Publish
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11.5px] font-semibold text-muted">
              Select 2 versions to compare
            </p>
            <button
              type="button"
              disabled={pending || selected.length !== 2}
              onClick={() => {
                const [a, b] = selected;
                if (a == null || b == null) return;
                setError(null);
                startTransition(async () => {
                  const result = await actionCompareTemplateVersions({
                    templateId,
                    versionA: Math.min(a, b),
                    versionB: Math.max(a, b),
                  });
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setDiff({
                    versionA: result.versionA,
                    versionB: result.versionB,
                    diff: result.diff,
                  });
                });
              }}
              className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
            >
              Compare
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-[#fecdca] bg-[#fef2f2] px-2.5 py-2 text-[12.5px] text-bad">
              {error}
            </p>
          ) : null}

          {diff ? (
            <div className="rounded-xl border border-brand/25 bg-[#fff8f3] px-3 py-2.5 text-[12.5px]">
              <p className="font-semibold text-brand">
                {formatTemplateVersion(diff.versionA)} →{" "}
                {formatTemplateVersion(diff.versionB)}
              </p>
              <p className="mt-1 text-muted">{diff.diff.summary.join(" · ")}</p>
              {diff.diff.fieldsAdded.length ? (
                <p className="mt-1.5 text-[11.5px] text-muted">
                  Added: {diff.diff.fieldsAdded.join(", ")}
                </p>
              ) : null}
              {diff.diff.fieldsRemoved.length ? (
                <p className="text-[11.5px] text-muted">
                  Removed: {diff.diff.fieldsRemoved.join(", ")}
                </p>
              ) : null}
              {diff.diff.fieldsChanged.length ? (
                <p className="text-[11.5px] text-muted">
                  Changed: {diff.diff.fieldsChanged.join(", ")}
                </p>
              ) : null}
              {diff.diff.settingsChanged.length ? (
                <p className="text-[11.5px] text-muted">
                  Settings: {diff.diff.settingsChanged.join(", ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {versions.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-faint">
              {pending ? "Loading…" : "No versions yet."}
            </p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v) => {
                const checked = selected.includes(v.version);
                return (
                  <li
                    key={v.id}
                    className={`rounded-xl border px-3 py-2.5 ${
                      v.isCurrent
                        ? "border-brand/35 bg-[#fff8f3]"
                        : "border-[#edf0f5] bg-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-start gap-2">
                      <label className="mt-0.5 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(v.version)}
                        />
                        <span className="text-[13px] font-semibold text-[#13233c]">
                          {formatTemplateVersion(v.version)}
                        </span>
                      </label>
                      {v.isCurrent ? (
                        <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                          Current
                        </span>
                      ) : null}
                      <span className="text-[11.5px] text-faint">
                        {v.fieldCount} fields ·{" "}
                        {new Date(v.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted">
                      {v.changelog || "No change log"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={pending || v.isCurrent}
                        onClick={() => {
                          if (
                            !window.confirm(
                              `Restore ${formatTemplateVersion(v.version)} as a new head version?`,
                            )
                          ) {
                            return;
                          }
                          setError(null);
                          startTransition(async () => {
                            const result = await actionRestoreTemplateVersion({
                              templateId,
                              version: v.version,
                            });
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            onChanged(
                              `Restored ${formatTemplateVersion(v.version)} → ${formatTemplateVersion(result.version ?? currentVersion + 1)}.`,
                            );
                            refresh();
                          });
                        }}
                        className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          startTransition(async () => {
                            const result = await actionDuplicateTemplateVersion({
                              templateId,
                              version: v.version,
                            });
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            onChanged(
                              `Duplicated ${formatTemplateVersion(v.version)} as a personal draft.`,
                            );
                          });
                        }}
                        className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
                      >
                        Duplicate version
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
