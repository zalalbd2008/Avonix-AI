"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Field, FormError, SubmitButton } from "@/components/ui/field";
import {
  createRoleAction,
  deleteRoleAction,
  inviteMemberAction,
  revokeInviteAction,
  seedTemplateRolesAction,
  updateRolePermissionsAction,
} from "@/lib/team/actions";

type MemberRow = {
  membershipId: string;
  userId: string;
  role: string;
  customRoleId: string | null;
  email: string;
  name: string | null;
  roleName: string | null;
};

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
};

type InviteRow = {
  id: string;
  email: string;
  memberRole: string;
  customRoleId: string | null;
  expiresAt: Date | string;
  roleName: string | null;
};

type PermGroup = [string, { key: string; label: string }[]];

const selectClass =
  "w-full rounded-lg border border-[#dbe1ea] px-3 py-2.5 text-sm outline-none focus:border-brand";

export function TeamPanel({
  canManage,
  members,
  roles,
  invites,
  permissionGroups,
  currentUserId,
  agencyName,
}: {
  canManage: boolean;
  members: MemberRow[];
  roles: RoleRow[];
  invites: InviteRow[];
  permissionGroups: PermGroup[];
  currentUserId: string;
  agencyName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  useEffect(() => {
    function openInvite() {
      setShowInvite(true);
      document
        .getElementById("team-invite-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("avonix:team-invite", openInvite);
    return () => window.removeEventListener("avonix:team-invite", openInvite);
  }, []);

  const owners = members.filter((m) => m.role === "owner").length;
  const admins = members.filter((m) => m.role === "admin").length;
  const staff = members.filter((m) => m.role === "member").length;

  function run(
    fn: () => Promise<{
      ok: boolean;
      error?: string;
      url?: string;
      message?: string;
    }>,
  ) {
    setError(null);
    setNotice(null);
    setInviteUrl(null);
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          setError(res.error ?? "Something went wrong.");
          return;
        }
        if (typeof res.message === "string" && res.message) {
          setNotice(res.message);
        }
        if ("url" in res && typeof res.url === "string") setInviteUrl(res.url);
        router.refresh();
        if (res.message?.toLowerCase().includes("template")) {
          document
            .getElementById("team-roles")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch (e) {
        console.error(e);
        setError("Something went wrong. Check the console and try again.");
      }
    });
  }

  function togglePerm(key: string) {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <div>
      <FormError message={error} />

      {notice ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#bfe9e2] bg-[#f0fdf9] px-3.5 py-[11px] text-[13px] text-ok">
          <span className="size-2 shrink-0 rounded-full bg-ok" />
          <span>{notice}</span>
        </div>
      ) : null}

      {inviteUrl ? (
        <div className="mb-4 flex items-center gap-2.5 rounded-[10px] border border-[#bfe9e2] bg-[#f0fdf9] px-3.5 py-[11px] text-[13px] text-ok">
          <span className="size-2 shrink-0 rounded-full bg-ok" />
          <span className="min-w-0">
            Invitation sent. Local copies land in{" "}
            <code className="text-ink">apps/web/.mail/</code>.
          </span>
          <a
            href={inviteUrl}
            className="ml-auto shrink-0 font-semibold text-brand hover:underline"
          >
            Open link →
          </a>
        </div>
      ) : null}

      {!canManage ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-line bg-white px-3.5 py-[11px] text-[13px]">
          <span className="mt-1 size-2 shrink-0 rounded-full bg-[#c9d2de]" />
          <span className="text-muted">
            You can view the team for <b className="text-ink">{agencyName}</b>.
            Only owners and admins can invite people or change roles.
          </span>
        </div>
      ) : null}

      {/* Metrics — same proportions as Dashboard / Organization overview */}
      <div className="mb-[22px] grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { value: members.length, label: "Total members" },
          { value: owners + admins, label: "Owners & admins" },
          { value: staff, label: "Staff seats" },
          {
            value: invites.length,
            label: "Pending invites",
            tone: invites.length > 0 ? "text-warn" : undefined,
          },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-[10px] border border-line bg-white px-4 pt-4 pb-3.5"
          >
            <div
              className={`text-2xl font-bold tracking-[-0.02em] ${m.tone ?? ""}`}
            >
              {m.value}
            </div>
            <div className="mt-[3px] text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Invite panel */}
      {canManage && showInvite ? (
        <section
          id="team-invite-panel"
          className="mb-4 overflow-hidden rounded-xl border border-line bg-white"
        >
          <div className="flex items-center border-b border-[#edf0f5] px-4 py-[13px]">
            <h2 className="text-sm font-semibold">Invite teammate</h2>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="ml-auto text-[12.5px] font-semibold text-muted hover:text-ink"
            >
              Close
            </button>
          </div>
          <form
            className="grid gap-0 px-4 py-4 md:grid-cols-3 md:gap-x-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(async () => {
                const res = await inviteMemberAction({
                  email: String(fd.get("email") ?? ""),
                  customRoleId: String(fd.get("roleId") ?? "") || null,
                  memberRole: String(fd.get("memberRole") ?? "member") as
                    | "admin"
                    | "member",
                });
                if (res.ok) {
                  setShowInvite(false);
                  e.currentTarget.reset();
                }
                return res;
              });
            }}
          >
            <Field
              label="Work email"
              name="email"
              type="email"
              required
              placeholder="colleague@company.com"
            />
            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">Seat</span>
              <select name="memberRole" className={selectClass} defaultValue="member">
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="mb-3.5 block">
              <span className="mb-1.5 block text-[12.5px] font-semibold">
                Permission role
              </span>
              <select name="roleId" className={selectClass} defaultValue="">
                <option value="">None</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="md:col-span-3 flex flex-wrap items-center gap-3">
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <SubmitButton pending={pending}>Send invitation</SubmitButton>
              </div>
              <p className="text-[12.5px] text-muted">
                They get an email with a 14-day link to join {agencyName}.
              </p>
            </div>
          </form>
        </section>
      ) : null}

      {/* Members + pending invites */}
      <div className="mb-4 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-line bg-white lg:col-span-2">
          <div className="flex items-center border-b border-[#edf0f5] px-4 py-[13px]">
            <h2 className="text-sm font-semibold">Members</h2>
            {canManage ? (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="ml-auto text-[12.5px] font-semibold text-brand hover:underline"
              >
                + Invite
              </button>
            ) : null}
          </div>

          {/* Column labels */}
          <div className="hidden border-b border-[#f1f4f8] px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-faint sm:grid sm:grid-cols-[1fr_140px_88px] sm:gap-3">
            <span>Person</span>
            <span>Role</span>
            <span className="text-right">Seat</span>
          </div>

          {members.length === 0 ? (
            <Empty
              title="No members yet"
              body="Invite the first teammate and assign a permission role."
              action={
                canManage ? (
                  <button
                    type="button"
                    onClick={() => setShowInvite(true)}
                    className="mt-3.5 inline-block rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
                  >
                    + Invite teammate
                  </button>
                ) : null
              }
            />
          ) : (
            members.map((m) => (
              <div
                key={m.membershipId}
                className="grid items-center gap-2 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#f8fafc] sm:grid-cols-[1fr_140px_88px] sm:gap-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
                    {(m.name || m.email).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold">
                      {m.name || m.email}
                      {m.userId === currentUserId ? (
                        <span className="ml-1.5 text-[11px] font-medium text-faint">
                          you
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {m.email}
                    </span>
                  </span>
                </div>
                <span className="truncate text-[12.5px] text-muted">
                  {m.roleName ?? (m.role === "owner" ? "Full access" : "—")}
                </span>
                <span className="sm:text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] ${
                      m.role === "owner"
                        ? "bg-[rgba(255,102,0,.1)] text-brand"
                        : m.role === "admin"
                          ? "bg-[rgba(13,148,136,.1)] text-ok"
                          : "bg-[#f1f4f8] text-muted"
                    }`}
                  >
                    {m.role}
                  </span>
                </span>
              </div>
            ))
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center border-b border-[#edf0f5] px-4 py-[13px]">
            <h2 className="text-sm font-semibold">Pending invites</h2>
            <span className="ml-auto text-[12.5px] text-muted">{invites.length}</span>
          </div>

          {!canManage ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-muted">
              Invites are visible to owners and admins.
            </p>
          ) : invites.length === 0 ? (
            <Empty
              title="Inbox clear"
              body="No open invitations. Send one when you need another seat."
            />
          ) : (
            invites.map((inv) => (
              <div
                key={inv.id}
                className="border-b border-[#f1f4f8] px-4 py-3.5 last:border-0"
              >
                <div className="flex items-start gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f1f4f8] text-[13px] font-semibold text-muted">
                    {inv.email.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{inv.email}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {inv.roleName ?? inv.memberRole}
                    </p>
                    <p className="mt-1 text-[11.5px] text-faint">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => revokeInviteAction(inv.id))}
                  className="mt-2.5 text-[12.5px] font-semibold text-bad hover:underline"
                >
                  Revoke invite
                </button>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Roles — full width */}
      <section id="team-roles" className="mb-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Roles & permissions</h2>
          <span className="text-[12.5px] text-muted">
            {roles.length} role{roles.length === 1 ? "" : "s"}
          </span>
          {canManage ? (
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => seedTemplateRolesAction())}
                className="rounded-lg border-[1.5px] border-line px-3.5 py-2 text-[13px] font-semibold text-muted hover:border-brand hover:text-brand disabled:opacity-60"
              >
                {pending ? "Adding…" : "Add templates"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateRole((v) => !v);
                  setEditingRoleId(null);
                  setSelectedPerms([]);
                }}
                className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark"
              >
                {showCreateRole ? "Close" : "+ New role"}
              </button>
            </div>
          ) : null}
        </div>

        {canManage && showCreateRole ? (
          <div className="mb-3.5 overflow-hidden rounded-xl border border-brand bg-white">
            <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
              Create role
            </div>
            <form
              className="px-4 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(async () => {
                  const res = await createRoleAction({
                    name: String(fd.get("name") ?? ""),
                    description: String(fd.get("description") ?? ""),
                    permissions: selectedPerms,
                  });
                  if (res.ok) {
                    setSelectedPerms([]);
                    setShowCreateRole(false);
                    e.currentTarget.reset();
                  }
                  return res;
                });
              }}
            >
              <div className="mb-1 grid gap-0 md:grid-cols-2 md:gap-x-4">
                <Field label="Name" name="name" required placeholder="Sales Manager" />
                <Field
                  label="Description"
                  name="description"
                  placeholder="What this role can do"
                />
              </div>
              <div className="mb-4 rounded-[10px] border border-[#edf0f5] bg-[#fafbfc] px-3.5 py-3">
                <p className="mb-2.5 text-[12.5px] font-semibold">Permissions</p>
                <PermissionPicker
                  groups={permissionGroups}
                  selected={selectedPerms}
                  onToggle={togglePerm}
                />
              </div>
              <div className="max-w-xs">
                <SubmitButton pending={pending}>Create role</SubmitButton>
              </div>
            </form>
          </div>
        ) : null}

        {roles.length === 0 ? (
          <div className="rounded-xl border border-line bg-white">
            <Empty
              title="No roles yet"
              body="Add Sales, Support, Marketing and Developer templates, or build a custom role."
              action={
                canManage ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => seedTemplateRolesAction())}
                    className="mt-3.5 inline-block rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
                  >
                    Add templates
                  </button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {roles.map((r) => {
              const editing = editingRoleId === r.id;
              const assigned = members.filter((m) => m.customRoleId === r.id).length;
              return (
                <div
                  key={r.id}
                  className={`flex flex-col rounded-xl border bg-white p-4 ${
                    editing ? "border-brand" : "border-line"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-bold tracking-[-0.01em]">
                          {r.name}
                        </span>
                        {r.isSystem ? (
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                            template
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 min-h-[36px] text-[12.5px] leading-[1.45] text-muted">
                        {r.description || "Custom permission set for this organization."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-3 text-[12px] text-faint">
                    <span>
                      {r.permissions.length} permission
                      {r.permissions.length === 1 ? "" : "s"}
                    </span>
                    <span>·</span>
                    <span>
                      {assigned} member{assigned === 1 ? "" : "s"}
                    </span>
                  </div>

                  {editing ? (
                    <div className="mt-3 rounded-[10px] border border-[#edf0f5] bg-[#fafbfc] px-3 py-3">
                      <PermissionPicker
                        groups={permissionGroups}
                        selected={selectedPerms}
                        onToggle={togglePerm}
                      />
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
                          onClick={() =>
                            run(async () => {
                              const res = await updateRolePermissionsAction({
                                roleId: r.id,
                                permissions: selectedPerms,
                              });
                              if (res.ok) setEditingRoleId(null);
                              return res;
                            })
                          }
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink"
                          onClick={() => setEditingRoleId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto flex gap-2 pt-3.5">
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            className="flex-1 rounded-lg border border-line py-2.5 text-center text-[13px] font-semibold text-muted hover:border-brand hover:text-brand"
                            onClick={() => {
                              setShowCreateRole(false);
                              setEditingRoleId(r.id);
                              setSelectedPerms(r.permissions);
                            }}
                          >
                            Edit permissions
                          </button>
                          {!r.isSystem ? (
                            <button
                              type="button"
                              disabled={pending}
                              className="rounded-lg px-3 py-2.5 text-[13px] font-semibold text-bad hover:underline"
                              onClick={() => run(() => deleteRoleAction(r.id))}
                            >
                              Delete
                            </button>
                          ) : null}
                        </>
                      ) : (
                        <div className="w-full rounded-lg bg-[#f1f4f8] py-2.5 text-center text-[13px] font-semibold text-muted">
                          View only
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-4 text-[12px] text-faint">
        Owners and admins always see the full workspace. Staff members only see
        menu items allowed by their permission role.
      </p>
    </div>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[13.5px] font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-muted">{body}</p>
      {action}
    </div>
  );
}

function PermissionPicker({
  groups,
  selected,
  onToggle,
}: {
  groups: PermGroup[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-3.5">
      {groups.map(([group, perms]) => (
        <div key={group}>
          <p className="mb-1.5 text-[11.5px] font-semibold text-faint">{group}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {perms.map((p) => {
              const on = selected.includes(p.key);
              return (
                <label
                  key={p.key}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[12.5px] transition-colors ${
                    on
                      ? "border-brand/35 bg-brand/5"
                      : "border-[#edf0f5] bg-white hover:border-[#dbe1ea]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => onToggle(p.key)}
                    className="accent-brand"
                  />
                  <span className="font-medium text-ink">{p.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
