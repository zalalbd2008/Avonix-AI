"use client";

import { useState } from "react";
import type { Organization } from "@/lib/agency/organizations";
import { switchOrganization } from "@/lib/agency/actions";
import { DeleteOrganizationButton } from "@/components/agency/delete-organization-button";
import { limitsFor } from "@/lib/plans";

const PLAN_TONE: Record<Organization["plan"], string> = {
  starter: "bg-[#f1f4f8] text-muted",
  professional: "bg-[rgba(13,148,136,.1)] text-ok",
  agency: "bg-[rgba(255,102,0,.1)] text-brand",
  enterprise: "bg-[rgba(11,30,58,.1)] text-navy",
};

const ROLE_LABEL: Record<Organization["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

/**
 * One organization card — open switches tenant; owners can delete.
 */
export function OrganizationCard({
  org,
  active,
  platformAccess,
}: {
  org: Organization;
  active: boolean;
  /** Platform Owner impersonation — no membership delete / switch. */
  platformAccess?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (active || platformAccess) {
      window.location.assign("/clients");
      return;
    }

    setPending(true);
    setError(null);

    const result = await switchOrganization(org.id);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    window.location.assign("/clients");
  }

  const canDelete = org.role === "owner" && !platformAccess;
  const statusLabel =
    org.status === "trialing"
      ? "Trial"
      : org.status === "past_due"
        ? "Past due"
        : org.status === "canceled"
          ? "Canceled"
          : "Active";

  return (
    <div
      className={`flex h-[240px] w-[360px] max-w-full flex-col rounded-xl border bg-white p-4 transition-[border-color,box-shadow] ${
        active
          ? "border-brand shadow-[0_4px_16px_rgba(255,102,0,.08)]"
          : "border-line hover:border-[#c3ccd9] hover:shadow-[0_8px_24px_rgba(11,30,58,.06)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-brand text-[14px] font-bold text-white">
          {org.name.charAt(0).toUpperCase()}
        </span>
        <p className="min-w-0 truncate text-[15px] font-bold text-ink">
          {org.name}
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${PLAN_TONE[org.plan]}`}
          >
            {limitsFor(org.plan).label}
          </span>
          {active ? (
            <span className="rounded-full bg-[rgba(13,148,136,.1)] px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-ok">
              {platformAccess ? "MANAGING" : "CURRENT"}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        <Stat
          value={String(org.clients)}
          label="Clients"
          tone="bg-sky-50 text-sky-800"
          labelTone="text-sky-600"
        />
        <Stat
          value={String(org.websites)}
          label="Sites"
          tone="bg-violet-50 text-violet-800"
          labelTone="text-violet-600"
        />
        <Stat
          value={String(org.connected)}
          label="Live"
          tone="bg-emerald-50 text-emerald-800"
          labelTone="text-emerald-600"
        />
        <Stat
          value={String(org.members)}
          label="Team"
          tone="bg-amber-50 text-amber-900"
          labelTone="text-amber-700"
        />
      </div>

      <p className="mt-3.5 text-center text-[11.5px] text-muted">
        Your role ·{" "}
        <span className="font-semibold text-ink">{ROLE_LABEL[org.role]}</span>
        <span className="text-faint"> · </span>
        Billing · <span className="font-semibold text-ink">{statusLabel}</span>
      </p>

      {error ? (
        <p className="mt-2 text-center text-[12px] font-medium text-bad">
          {error}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-2.5 pt-3">
        {canDelete ? (
          <DeleteOrganizationButton agencyId={org.id} orgName={org.name} />
        ) : null}
        <button
          type="button"
          onClick={open}
          disabled={pending}
          className="flex-1 rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(255,102,0,.28)] transition hover:bg-brand-dark hover:shadow-[0_6px_16px_rgba(255,102,0,.35)] active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Opening…" : "Open →"}
        </button>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
  labelTone,
}: {
  value: string;
  label: string;
  tone: string;
  labelTone: string;
}) {
  return (
    <div className={`rounded-lg px-1.5 py-2 text-center ${tone}`}>
      <div className="truncate text-[14px] font-bold" title={value}>
        {value}
      </div>
      <div className={`truncate text-[10px] font-semibold ${labelTone}`}>
        {label}
      </div>
    </div>
  );
}
