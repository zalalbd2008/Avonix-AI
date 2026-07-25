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

  return (
    <div
      className={`rounded-xl border bg-white p-[18px] ${
        active ? "border-brand" : "border-line"
      }`}
    >
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="w-full cursor-pointer text-left hover:opacity-95 disabled:opacity-60"
      >
        <div className="mb-3 flex items-center gap-2.5">
          <span className="grid size-[38px] shrink-0 place-items-center rounded-[10px] bg-brand text-[15px] font-bold text-white">
            {org.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-[15px] font-bold">
            {org.name}
          </span>
          {active && (
            <span className="ml-auto shrink-0 rounded-full bg-[rgba(13,148,136,.1)] px-2 py-[3px] text-[10.5px] font-bold text-ok">
              {platformAccess ? "MANAGING" : "CURRENT"}
            </span>
          )}
        </div>

        <div className="mb-3.5 text-[12.5px] text-muted">
          {org.clients} {org.clients === 1 ? "client" : "clients"} ·{" "}
          {org.websites} {org.websites === 1 ? "website" : "websites"}
        </div>

        <div className="flex items-center">
          <span
            className={`rounded-full px-2.5 py-[3px] text-[11px] font-bold ${PLAN_TONE[org.plan]}`}
          >
            {limitsFor(org.plan).label}
          </span>
          <span className="ml-auto text-[13px] font-semibold text-brand">
            {pending ? "Opening…" : "Open →"}
          </span>
        </div>
      </button>

      {error && (
        <p className="mt-2 text-[12px] font-medium text-bad">{error}</p>
      )}

      {org.role === "owner" && !platformAccess ? (
        <div
          className="mt-3 border-t border-[#edf0f5] pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <DeleteOrganizationButton
            agencyId={org.id}
            orgName={org.name}
          />
        </div>
      ) : null}
    </div>
  );
}
