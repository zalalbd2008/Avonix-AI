"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/ui/field";
import {
  deleteRoleAction,
  updateRolePermissionsAction,
} from "@/lib/team/actions";

type PermGroup = [string, { key: string; label: string }[]];

export function RoleDetailPanel({
  role,
  assignedMembers,
  canManage,
  permissionGroups,
}: {
  role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: string[];
  };
  assignedMembers: {
    membershipId: string;
    name: string | null;
    email: string;
    role: string;
  }[];
  canManage: boolean;
  permissionGroups: PermGroup[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState(role.permissions);

  function togglePerm(key: string) {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setSaved(false);
  }

  function save() {
    if (!canManage) return;
    setError(null);
    start(async () => {
      const res = await updateRolePermissionsAction({
        roleId: role.id,
        permissions: selectedPerms,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  function remove() {
    if (!canManage || role.isSystem) return;
    const ok = window.confirm(
      `Delete role “${role.name}”? Members using it will lose this custom role.`,
    );
    if (!ok) return;
    setError(null);
    start(async () => {
      const res = await deleteRoleAction(role.id);
      if (!res.ok) {
        setError(res.error ?? "Could not delete.");
        return;
      }
      window.location.assign("/settings/members");
    });
  }

  return (
    <div className="space-y-5">
      <FormError message={error} />

      <section className="rounded-2xl border border-[#E1B280]/55 bg-[#E9F3B8]/35 p-5 shadow-[0_4px_18px_rgba(78,156,134,.08)] sm:p-6">
        <div className="flex flex-wrap items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#4E9C86] text-[18px] font-bold text-white">
            {role.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-bold text-ink">{role.name}</h2>
              {role.isSystem ? (
                <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  template
                </span>
              ) : (
                <span className="rounded-full bg-[#99E2A7]/40 px-2.5 py-0.5 text-[11px] font-semibold text-[#2f6b52]">
                  custom
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-muted">
              {role.description || "Custom permission set for this organization."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#99E2A7]/45 px-2.5 py-1 text-[12px] font-semibold text-[#2f6b52]">
                {selectedPerms.length} permission
                {selectedPerms.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-semibold text-[#4E9C86] ring-1 ring-[#4E9C86]/20">
                {assignedMembers.length} member
                {assignedMembers.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_4px_16px_rgba(11,30,58,.04)] sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-bold text-ink">Permissions</h3>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {canManage
                  ? "Toggle access for this role, then save."
                  : "View-only — ask an owner or admin to make changes."}
              </p>
            </div>
            {canManage ? (
              <div className="flex items-center gap-2">
                {saved ? (
                  <span className="text-[12px] font-semibold text-ok">Saved</span>
                ) : null}
                <button
                  type="button"
                  disabled={pending}
                  onClick={save}
                  className="rounded-lg bg-[#4E9C86] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#3f8571] disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save permissions"}
                </button>
              </div>
            ) : null}
          </div>

          <div className="space-y-5">
            {permissionGroups.map(([group, perms]) => (
              <div key={group}>
                <p className="mb-2 text-[11.5px] font-bold tracking-wide text-faint uppercase">
                  {group}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {perms.map((p) => {
                    const on = selectedPerms.includes(p.key);
                    return (
                      <label
                        key={p.key}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition-colors ${
                          canManage ? "cursor-pointer" : "cursor-default opacity-90"
                        } ${
                          on
                            ? "border-[#4E9C86]/40 bg-[#99E2A7]/25"
                            : "border-[#edf0f5] bg-[#fafbfc] hover:border-[#E1B280]/60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={!canManage || pending}
                          onChange={() => togglePerm(p.key)}
                          className="accent-[#4E9C86]"
                        />
                        <span className="font-medium text-ink">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-4 shadow-[0_4px_16px_rgba(11,30,58,.04)]">
            <h3 className="text-[13px] font-bold text-ink">Assigned members</h3>
            {assignedMembers.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-muted">
                No one uses this role yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {assignedMembers.map((m) => (
                  <li
                    key={m.membershipId}
                    className="rounded-lg bg-[#E9F3B8]/40 px-3 py-2"
                  >
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {m.name || m.email}
                    </p>
                    <p className="truncate text-[11.5px] text-muted">{m.email}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canManage && !role.isSystem ? (
            <button
              type="button"
              disabled={pending}
              onClick={remove}
              className="w-full rounded-lg border border-[#fecaca] bg-white px-3 py-2.5 text-[13px] font-semibold text-bad hover:bg-[#fff5f5] disabled:opacity-60"
            >
              Delete role
            </button>
          ) : null}

          <Link
            href={"/settings/members" as never}
            className="block text-center text-[13px] font-semibold text-[#4E9C86] hover:underline"
          >
            ← Back to Role Management
          </Link>
        </aside>
      </div>
    </div>
  );
}
