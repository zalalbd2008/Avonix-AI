"use client";

import { useState, useTransition } from "react";
import type {
  FormAdminCrmConfig,
  FormLeadPriority,
  FormSubmissionCrm,
} from "@/lib/db/schema";
import { updateSubmissionCrm } from "@/lib/forms/admin-crm-actions";
import {
  LEAD_PRIORITIES,
  normalizeAdminCrm,
  normalizeSubmissionCrm,
  priorityLabel,
  statusLabel,
} from "@/lib/forms/admin-crm";

type Props = {
  clientId: string;
  formId: string;
  submissionId: string;
  admin: FormAdminCrmConfig;
  crm: FormSubmissionCrm;
  compact?: boolean;
};

/**
 * Inline lead CRM controls on the form submissions list.
 */
export function SubmissionCrmPanel({
  clientId,
  formId,
  submissionId,
  admin: adminRaw,
  crm: crmRaw,
  compact,
}: Props) {
  const admin = normalizeAdminCrm(adminRaw);
  const [crm, setCrm] = useState(() =>
    normalizeSubmissionCrm(crmRaw, admin),
  );
  const [noteDraft, setNoteDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!compact);
  const [pending, startTransition] = useTransition();

  function save(patch: Parameters<typeof updateSubmissionCrm>[0]["patch"]) {
    setError(null);
    startTransition(async () => {
      const result = await updateSubmissionCrm({
        clientId,
        formId,
        submissionId,
        patch,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCrm((prev) => {
        const next = { ...prev, ...patch };
        if (patch.addNote?.trim()) {
          const note = patch.addNote.trim();
          next.notes = prev.notes ? `${prev.notes}\n\n${note}` : note;
          next.timeline = [
            ...(prev.timeline ?? []),
            {
              id: `local_${Date.now()}`,
              at: new Date().toISOString(),
              type: "note" as const,
              message: note,
            },
          ];
        }
        if (patch.priority) next.priority = patch.priority;
        if (patch.statusId) next.statusId = patch.statusId;
        if (patch.assignee !== undefined) next.assignee = patch.assignee;
        if (patch.tags) next.tags = patch.tags;
        if (patch.notes !== undefined) next.notes = patch.notes;
        return normalizeSubmissionCrm(next, admin);
      });
      if (patch.addNote) setNoteDraft("");
    });
  }

  const status = admin.statuses?.find((s) => s.id === crm.statusId);
  const presets = admin.tagPresets ?? [];

  return (
    <div className="mt-2 rounded-lg border border-[#edf0f5] bg-[#fbfcfe]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{
            background: status?.color ? `${status.color}22` : "#e2e8f0",
            color: status?.color || "#475569",
          }}
        >
          {statusLabel(admin, crm.statusId)}
        </span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            crm.priority === "urgent"
              ? "bg-red-50 text-red-700"
              : crm.priority === "high"
                ? "bg-amber-50 text-amber-800"
                : "bg-[#f1f4f8] text-muted"
          }`}
        >
          {priorityLabel(crm.priority)}
        </span>
        {crm.assignee ? (
          <span className="truncate text-[11.5px] text-faint">
            → {crm.assignee}
          </span>
        ) : null}
        {(crm.tags?.length ?? 0) > 0 ? (
          <span className="truncate text-[11px] text-faint">
            {(crm.tags ?? []).slice(0, 3).join(" · ")}
          </span>
        ) : null}
        <span className="ml-auto text-[11px] font-semibold text-muted">
          {open ? "Hide" : "CRM"}
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-2.5 border-t border-[#edf0f5] px-3 py-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
                Status
              </span>
              <select
                value={crm.statusId ?? "new"}
                disabled={pending}
                onChange={(e) => save({ statusId: e.target.value })}
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
              >
                {(admin.statuses ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
                Priority
              </span>
              <select
                value={crm.priority ?? "normal"}
                disabled={pending}
                onChange={(e) =>
                  save({ priority: e.target.value as FormLeadPriority })
                }
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
              >
                {LEAD_PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
              Assign to
            </span>
            <input
              value={crm.assignee ?? ""}
              disabled={pending}
              onChange={(e) => setCrm({ ...crm, assignee: e.target.value })}
              onBlur={(e) => {
                if (e.target.value !== (crmRaw.assignee ?? "")) {
                  save({ assignee: e.target.value });
                }
              }}
              placeholder="Teammate email or name"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
            />
          </label>

          <div>
            <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
              Tags
            </span>
            <div className="mb-1.5 flex flex-wrap gap-1">
              {(crm.tags ?? []).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    save({ tags: (crm.tags ?? []).filter((x) => x !== t) })
                  }
                  className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[11px] font-semibold text-muted hover:bg-red-50 hover:text-red-700"
                >
                  {t} ×
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {presets
                .filter((p) => !(crm.tags ?? []).includes(p))
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      save({ tags: [...(crm.tags ?? []), p].slice(0, 20) })
                    }
                    className="rounded-full border border-dashed border-[#dbe1ea] px-2 py-0.5 text-[11px] font-semibold text-faint hover:border-brand hover:text-brand"
                  >
                    + {p}
                  </button>
                ))}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder="Custom tag"
                className="min-w-0 flex-1 rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
              />
              <button
                type="button"
                disabled={pending || !tagDraft.trim()}
                onClick={() => {
                  const t = tagDraft.trim();
                  if (!t) return;
                  save({ tags: [...(crm.tags ?? []), t].slice(0, 20) });
                  setTagDraft("");
                }}
                className="rounded-lg border border-[#dbe1ea] px-2.5 py-1.5 text-[12px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
              Internal notes
            </span>
            <textarea
              rows={2}
              value={noteDraft}
              disabled={pending}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note to the activity timeline…"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
            />
            <button
              type="button"
              disabled={pending || !noteDraft.trim()}
              onClick={() => save({ addNote: noteDraft })}
              className="mt-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
            >
              Add note
            </button>
          </label>

          {(crm.notes || "").trim() ? (
            <div className="rounded-lg bg-white px-2.5 py-2 text-[12px] leading-relaxed whitespace-pre-wrap text-muted">
              {crm.notes}
            </div>
          ) : null}

          <div>
            <span className="mb-1 block text-[10.5px] font-semibold tracking-wide text-faint uppercase">
              Activity
            </span>
            <ul className="max-h-36 overflow-auto rounded-lg border border-[#edf0f5] bg-white">
              {[...(crm.timeline ?? [])].reverse().map((ev) => (
                <li
                  key={ev.id}
                  className="border-b border-[#f1f4f8] px-2.5 py-1.5 text-[11.5px] last:border-0"
                >
                  <span className="font-medium text-[#1a2332]">{ev.message}</span>
                  <span className="mt-0.5 block text-[10.5px] text-faint">
                    {formatWhen(ev.at)}
                    {ev.actor ? ` · ${ev.actor}` : ""}
                  </span>
                </li>
              ))}
              {(crm.timeline?.length ?? 0) === 0 ? (
                <li className="px-2.5 py-3 text-center text-[11.5px] text-faint">
                  No activity yet
                </li>
              ) : null}
            </ul>
          </div>

          {error ? (
            <p className="text-[12px] font-medium text-bad">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
