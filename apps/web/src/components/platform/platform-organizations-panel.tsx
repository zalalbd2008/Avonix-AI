"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EnterOrganizationButton } from "@/components/platform/enter-organization-button";
import type { PlatformOrganization } from "@/lib/platform/types";
import { limitsFor } from "@/lib/plans";
import { timeAgo } from "@/components/ui/status-pill";

const PLAN_TONE: Record<PlatformOrganization["plan"], string> = {
  starter: "bg-[#f1f4f8] text-muted",
  professional: "bg-[rgba(13,148,136,.1)] text-ok",
  agency: "bg-[rgba(255,102,0,.1)] text-brand",
  enterprise: "bg-[rgba(11,30,58,.1)] text-navy",
};

const STATUS_TONE: Record<PlatformOrganization["status"], string> = {
  active: "bg-[rgba(13,148,136,.1)] text-ok",
  past_due: "bg-[#fef6e7] text-warn",
  canceled: "bg-[#f1f4f8] text-faint",
};

type Filter = "all" | PlatformOrganization["status"];

/**
 * Filterable organization inventory for Platform Owners.
 * Visual language matches Accounts dashboard + org cards in `(app)`.
 */
export function PlatformOrganizationsPanel({
  orgs,
}: {
  orgs: PlatformOrganization[];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orgs.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!needle) return true;
      return (
        o.name.toLowerCase().includes(needle) ||
        o.slug.toLowerCase().includes(needle) ||
        (o.ownerEmail?.toLowerCase().includes(needle) ?? false) ||
        (o.ownerName?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [orgs, q, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "past_due", label: "Past due" },
    { id: "canceled", label: "Canceled" },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, slug, or owner…"
          className="h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] outline-none placeholder:text-faint focus:border-brand sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                filter === f.id
                  ? "bg-navy text-white"
                  : "bg-[#f1f4f8] text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">No organizations found</p>
          <p className="mt-1 text-[12.5px] text-muted">
            {orgs.length === 0
              ? "Customer organizations appear here after signup."
              : "Try a different search or status filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_110px_100px_minmax(0,1fr)_88px_100px] gap-3 border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold tracking-wide text-faint uppercase sm:grid">
            <span>Organization</span>
            <span>Plan</span>
            <span>Status</span>
            <span>Owner</span>
            <span className="text-right">Usage</span>
            <span className="text-right">Actions</span>
          </div>
          {filtered.map((org) => (
            <div
              key={org.id}
              className="grid grid-cols-1 gap-2 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0 hover:bg-[#fafbfd] sm:grid-cols-[minmax(0,1.4fr)_110px_100px_minmax(0,1fr)_88px_100px] sm:items-center sm:gap-3"
            >
              <Link
                href={`/platform/workspaces/${org.id}` as never}
                className="flex min-w-0 items-center gap-2.5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
                  {org.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink hover:text-brand">
                    {org.name}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {org.slug} · created {timeAgo(org.createdAt)}
                  </span>
                </span>
              </Link>

              <span
                className={`w-fit rounded-full px-2.5 py-[3px] text-[11px] font-bold ${PLAN_TONE[org.plan]}`}
              >
                {limitsFor(org.plan).label}
              </span>

              <span
                className={`w-fit rounded-full px-2.5 py-[3px] text-[11px] font-bold capitalize ${STATUS_TONE[org.status]}`}
              >
                {org.status.replace("_", " ")}
              </span>

              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium">
                  {org.ownerName || org.ownerEmail || "—"}
                </span>
                {org.ownerName && org.ownerEmail ? (
                  <span className="block truncate text-[11.5px] text-muted">
                    {org.ownerEmail}
                  </span>
                ) : null}
              </span>

              <span className="text-[12.5px] text-muted sm:text-right">
                {org.clients}c · {org.websites}w · {org.members}m
              </span>

              <span className="sm:text-right">
                <EnterOrganizationButton
                  agencyId={org.id}
                  label="Open"
                  className="rounded-md bg-navy px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#162a45] disabled:opacity-60"
                />
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[12px] text-faint">
        Showing {filtered.length} of {orgs.length}. Loaded via the admin database
        role — tenant RLS does not apply on this screen.
      </p>
    </div>
  );
}
