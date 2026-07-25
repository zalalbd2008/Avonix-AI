"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deletePlatformOrganization,
  updatePlatformOrganization,
} from "@/lib/platform/actions";
import type { PlatformOrganization } from "@/lib/platform/types";

function numOrEmpty(v: number | undefined): string {
  return v != null && Number.isFinite(v) ? String(v) : "";
}

function parseLimitField(raw: string): number | null | undefined {
  const t = raw.trim();
  if (t === "") return null; // clear override
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.floor(n);
}

/**
 * Platform Owner controls: edit org, custom limits, suspend, delete.
 */
export function PlatformOrganizationEditor({
  org,
}: {
  org: PlatformOrganization;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(org.name);
  const [plan, setPlan] = useState(org.plan);
  const [status, setStatus] = useState(org.status);
  const [suspended, setSuspended] = useState(Boolean(org.overrides.suspended));
  const [complimentary, setComplimentary] = useState(
    Boolean(org.overrides.complimentary),
  );
  const [maxClients, setMaxClients] = useState(
    numOrEmpty(org.overrides.maxClients),
  );
  const [maxWebsites, setMaxWebsites] = useState(
    numOrEmpty(org.overrides.maxWebsites),
  );
  const [maxUsers, setMaxUsers] = useState(numOrEmpty(org.overrides.maxUsers));
  const [bonusAi, setBonusAi] = useState(
    numOrEmpty(org.overrides.bonusAiCredits),
  );
  const [bonusSites, setBonusSites] = useState(
    numOrEmpty(org.overrides.bonusWebsites),
  );

  function save() {
    start(async () => {
      setMsg(null);
      setError(null);

      const clientsLimit = parseLimitField(maxClients);
      const websitesLimit = parseLimitField(maxWebsites);
      const usersLimit = parseLimitField(maxUsers);
      const aiBonus = parseLimitField(bonusAi);
      const sitesBonus = parseLimitField(bonusSites);

      if (
        clientsLimit === undefined ||
        websitesLimit === undefined ||
        usersLimit === undefined ||
        aiBonus === undefined ||
        sitesBonus === undefined
      ) {
        setError("Limits must be empty (default) or a non-negative number.");
        return;
      }

      const r = await updatePlatformOrganization({
        agencyId: org.id,
        name,
        plan,
        status,
        suspended,
        complimentary,
        complimentaryPlan: complimentary ? plan : undefined,
        maxClients: clientsLimit,
        maxWebsites: websitesLimit,
        maxUsers: usersLimit,
        bonusAiCredits: aiBonus,
        bonusWebsites: sitesBonus,
      });

      if (!r.ok) {
        setError(r.error);
        return;
      }
      setMsg("Saved.");
      router.refresh();
    });
  }

  function remove() {
    const ok = window.confirm(
      `Permanently delete “${org.name}”? This cannot be undone. All organization data and member logins that belong only to this org will be removed forever.`,
    );
    if (!ok) return;

    start(async () => {
      setMsg(null);
      setError(null);
      const r = await deletePlatformOrganization(org.id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/platform/workspaces" as never);
      router.refresh();
    });
  }

  const field =
    "h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus:border-brand";
  const label = "mb-1 block text-[12px] font-semibold text-muted";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
          Edit organization
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="po-name">
              Name
            </label>
            <input
              id="po-name"
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="po-plan">
              Plan
            </label>
            <select
              id="po-plan"
              className={field}
              value={plan}
              onChange={(e) =>
                setPlan(e.target.value as PlatformOrganization["plan"])
              }
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="agency">Agency</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="po-status">
              Status
            </label>
            <select
              id="po-status"
              className={field}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as PlatformOrganization["status"])
              }
            >
              <option value="active">Active</option>
              <option value="past_due">Past due</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={complimentary}
              onChange={(e) => setComplimentary(e.target.checked)}
            />
            Complimentary access
          </label>
          <label className="flex items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={suspended}
              onChange={(e) => setSuspended(e.target.checked)}
            />
            Suspended
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
          Custom limits
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="po-max-clients">
              Max clients
            </label>
            <input
              id="po-max-clients"
              className={field}
              inputMode="numeric"
              placeholder="Plan default"
              value={maxClients}
              onChange={(e) => setMaxClients(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="po-max-websites">
              Max websites / client
            </label>
            <input
              id="po-max-websites"
              className={field}
              inputMode="numeric"
              placeholder="Plan default"
              value={maxWebsites}
              onChange={(e) => setMaxWebsites(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="po-max-users">
              Max users
            </label>
            <input
              id="po-max-users"
              className={field}
              inputMode="numeric"
              placeholder="Default 30"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="po-bonus-ai">
              Bonus AI credits
            </label>
            <input
              id="po-bonus-ai"
              className={field}
              inputMode="numeric"
              placeholder="0"
              value={bonusAi}
              onChange={(e) => setBonusAi(e.target.value)}
            />
          </div>
          <div>
            <label className={label} htmlFor="po-bonus-sites">
              Bonus websites
            </label>
            <input
              id="po-bonus-sites"
              className={field}
              inputMode="numeric"
              placeholder="0"
              value={bonusSites}
              onChange={(e) => setBonusSites(e.target.value)}
            />
          </div>
          <p className="sm:col-span-2 text-[12px] text-faint">
            Leave a field empty to clear the override and use the plan default.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-lg bg-brand px-3.5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="rounded-lg border border-[#f1d0d0] bg-[#fff8f8] px-3.5 py-2.5 text-[13px] font-semibold text-bad hover:border-bad disabled:opacity-50"
        >
          Delete organization
        </button>
      </div>

      {error ? (
        <p className="text-[12.5px] font-medium text-bad">{error}</p>
      ) : null}
      {msg ? <p className="text-[12.5px] font-medium text-ok">{msg}</p> : null}
    </div>
  );
}
