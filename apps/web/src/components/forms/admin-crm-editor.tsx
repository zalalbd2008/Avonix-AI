"use client";

import type {
  FormAdminCrmConfig,
  FormCrmStatusOption,
  FormLeadPriority,
} from "@/lib/db/schema";
import {
  DEFAULT_ADMIN_CRM,
  LEAD_PRIORITIES,
  normalizeAdminCrm,
} from "@/lib/forms/admin-crm";

/**
 * Form-level Admin CRM settings — workflow, tags, notification channels.
 */
export function AdminCrmEditor({
  value,
  onChange,
}: {
  value: FormAdminCrmConfig;
  onChange: (next: FormAdminCrmConfig) => void;
}) {
  const admin = normalizeAdminCrm(value);

  function patch(partial: Partial<FormAdminCrmConfig>) {
    onChange(normalizeAdminCrm({ ...admin, ...partial }));
  }

  function patchNotifications(
    partial: NonNullable<FormAdminCrmConfig["notifications"]>,
  ) {
    patch({
      notifications: { ...admin.notifications, ...partial },
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#edf0f5] bg-[#f8fafc] p-3">
      <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
        Admin CRM
      </p>
      <p className="text-[12px] leading-relaxed text-muted">
        Lead priority, status workflow, tags, assignment defaults, and Teams /
        webhook notifications for new submissions.
      </p>

      <label className="flex items-center gap-2 text-[12.5px] text-muted">
        <input
          type="checkbox"
          checked={admin.enabled !== false}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Enable CRM on submissions
      </label>

      {admin.enabled !== false ? (
        <>
          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Default priority
            </span>
            <select
              value={admin.defaultPriority ?? "normal"}
              onChange={(e) =>
                patch({
                  defaultPriority: e.target.value as FormLeadPriority,
                })
              }
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              {LEAD_PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Default status
            </span>
            <select
              value={admin.defaultStatusId ?? "new"}
              onChange={(e) => patch({ defaultStatusId: e.target.value })}
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            >
              {(admin.statuses ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Default assignee
            </span>
            <input
              value={admin.defaultAssignee ?? ""}
              onChange={(e) => patch({ defaultAssignee: e.target.value })}
              placeholder="name@agency.com"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>

          <StatusList
            statuses={admin.statuses ?? []}
            onChange={(statuses) => patch({ statuses })}
          />

          <label className="block">
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Tag presets (comma-separated)
            </span>
            <input
              value={(admin.tagPresets ?? []).join(", ")}
              onChange={(e) =>
                patch({
                  tagPresets: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
              placeholder="hot, follow-up, proposal"
              className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
            />
          </label>

          <div className="border-t border-[#edf0f5] pt-3">
            <p className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
              Notifications
            </p>
            <label className="mb-2 block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Extra email inboxes
              </span>
              <input
                value={(admin.notifications?.emails ?? []).join(", ")}
                onChange={(e) =>
                  patchNotifications({
                    emails: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="ops@agency.com, sales@…"
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
              />
            </label>
            <label className="mb-2 block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Teams webhook URL
              </span>
              <input
                value={admin.notifications?.teamsWebhookUrl ?? ""}
                onChange={(e) =>
                  patchNotifications({ teamsWebhookUrl: e.target.value })
                }
                placeholder="https://outlook.office.com/webhook/…"
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                Generic webhook URL
              </span>
              <input
                value={admin.notifications?.webhookUrl ?? ""}
                onChange={(e) =>
                  patchNotifications({ webhookUrl: e.target.value })
                }
                placeholder="https://…"
                className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[12px] outline-none focus:border-brand"
              />
            </label>
            <p className="mt-2 text-[11px] leading-snug text-faint">
              Primary email still lives under Form → Notification email. HTTPS
              only for webhooks.
            </p>
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => onChange(normalizeAdminCrm(DEFAULT_ADMIN_CRM))}
        className="self-start text-[11.5px] font-semibold text-muted hover:text-brand"
      >
        Reset CRM defaults
      </button>
    </div>
  );
}

function StatusList({
  statuses,
  onChange,
}: {
  statuses: FormCrmStatusOption[];
  onChange: (next: FormCrmStatusOption[]) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-muted">
          Status workflow
        </span>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...statuses,
              {
                id: `status_${statuses.length + 1}`,
                label: "New status",
                color: "#64748b",
              },
            ])
          }
          className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11.5px] font-semibold text-muted hover:border-brand hover:text-brand"
        >
          + Add
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {statuses.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <input
              type="color"
              value={s.color || "#64748b"}
              onChange={(e) =>
                onChange(
                  statuses.map((x, j) =>
                    j === i ? { ...x, color: e.target.value } : x,
                  ),
                )
              }
              className="h-8 w-8 shrink-0 cursor-pointer rounded border border-[#dbe1ea] bg-white p-0.5"
              title="Color"
            />
            <input
              value={s.label}
              onChange={(e) =>
                onChange(
                  statuses.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
              className="min-w-0 flex-1 rounded-lg border border-[#dbe1ea] bg-white px-2 py-1.5 text-[12.5px] outline-none focus:border-brand"
            />
            <button
              type="button"
              disabled={statuses.length <= 1}
              onClick={() => onChange(statuses.filter((_, j) => j !== i))}
              className="rounded-md px-2 py-1 text-[11.5px] font-semibold text-muted hover:text-bad disabled:opacity-40"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
