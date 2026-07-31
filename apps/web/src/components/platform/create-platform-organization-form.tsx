"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PasswordField } from "@/components/ui/password-field";
import { createPlatformOrganization } from "@/lib/platform/create-organization";
import { PLATFORM_ORG_SEATS } from "@/lib/team/permissions";

const field =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] outline-none focus:border-brand";
const labelCls = "mb-1 block text-[12px] font-semibold text-muted";

/**
 * Platform Owner — create a customer organization with limits + admin access.
 */
export function CreatePlatformOrganizationForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [plan, setPlan] = useState<
    "starter" | "professional" | "agency" | "enterprise"
  >("professional");
  const [seatId, setSeatId] = useState<string>("owner");
  const [adminEmail, setAdminEmail] = useState("");
  const [accessMode, setAccessMode] = useState<"invite" | "access">("invite");
  const [password, setPassword] = useState("");
  const [complimentary, setComplimentary] = useState(true);
  const [maxClients, setMaxClients] = useState("");
  const [maxWebsites, setMaxWebsites] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [bonusAi, setBonusAi] = useState("");
  const [bonusSites, setBonusSites] = useState("");

  const seat = useMemo(
    () => PLATFORM_ORG_SEATS.find((s) => s.id === seatId),
    [seatId],
  );

  function parseOpt(raw: string): number | null | undefined {
    const t = raw.trim();
    if (!t) return null;
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return Math.floor(n);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setError(null);
      setInviteUrl(null);

      const clients = parseOpt(maxClients);
      const websites = parseOpt(maxWebsites);
      const users = parseOpt(maxUsers);
      const ai = parseOpt(bonusAi);
      const sites = parseOpt(bonusSites);
      if (
        clients === undefined ||
        websites === undefined ||
        users === undefined ||
        ai === undefined ||
        sites === undefined
      ) {
        setError("Limits must be empty or a non-negative number.");
        return;
      }

      const result = await createPlatformOrganization({
        name,
        plan,
        seatId,
        adminEmail,
        accessMode,
        password: accessMode === "access" ? password : undefined,
        maxClients: clients,
        maxWebsites: websites,
        maxUsers: users,
        bonusAiCredits: ai,
        bonusWebsites: sites,
        complimentary,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.emailWarning) {
        setError(
          `Organization created, but email failed: ${result.emailWarning}`,
        );
      }
      if (result.mode === "invite" && result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
      }
      router.push(`/platform/workspaces/${result.agencyId}` as never);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title="Create organization"
        subtitle="Provision a customer tenant with plan, limits, and admin access"
        action={
          <Link
            href={"/platform/workspaces" as never}
            className="rounded-lg border border-line px-3.5 py-2.5 text-[13px] font-semibold text-muted hover:border-brand hover:text-ink"
          >
            Cancel
          </Link>
        }
      />

      <form onSubmit={onSubmit} className="space-y-5">
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
            Organization
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="org-name">
                Name
              </label>
              <input
                id="org-name"
                className={field}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Agency"
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="org-plan">
                Plan
              </label>
              <select
                id="org-plan"
                className={field}
                value={plan}
                onChange={(e) =>
                  setPlan(
                    e.target.value as
                      | "starter"
                      | "professional"
                      | "agency"
                      | "enterprise",
                  )
                }
              >
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="agency">Agency</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <label className="flex items-end gap-2 pb-2 text-[13px] font-medium">
              <input
                type="checkbox"
                checked={complimentary}
                onChange={(e) => setComplimentary(e.target.checked)}
              />
              Complimentary (no Stripe — Platform Owner grant)
            </label>
            {!complimentary ? (
              <p className="text-[12px] text-muted sm:col-span-2">
                Without complimentary, the organization admin must purchase a
                plan before they can use the workspace.
              </p>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
            Custom limits
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="max-clients">
                Max clients
              </label>
              <input
                id="max-clients"
                className={field}
                inputMode="numeric"
                placeholder="Plan default"
                value={maxClients}
                onChange={(e) => setMaxClients(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="max-websites">
                Max websites / client
              </label>
              <input
                id="max-websites"
                className={field}
                inputMode="numeric"
                placeholder="Plan default"
                value={maxWebsites}
                onChange={(e) => setMaxWebsites(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="max-users">
                Max users
              </label>
              <input
                id="max-users"
                className={field}
                inputMode="numeric"
                placeholder="Default 30"
                value={maxUsers}
                onChange={(e) => setMaxUsers(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="bonus-ai">
                Bonus AI credits
              </label>
              <input
                id="bonus-ai"
                className={field}
                inputMode="numeric"
                placeholder="0"
                value={bonusAi}
                onChange={(e) => setBonusAi(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="bonus-sites">
                Bonus websites
              </label>
              <input
                id="bonus-sites"
                className={field}
                inputMode="numeric"
                placeholder="0"
                value={bonusSites}
                onChange={(e) => setBonusSites(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
            Admin access
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="admin-email">
                Admin email
              </label>
              <input
                id="admin-email"
                type="email"
                className={field}
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@agency.com"
                required
              />
              <p className="mt-1 text-[11.5px] text-faint">
                Must be different from Platform Owner emails.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="seat">
                Role
              </label>
              <select
                id="seat"
                className={field}
                value={seatId}
                onChange={(e) => setSeatId(e.target.value)}
              >
                {PLATFORM_ORG_SEATS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {seat ? (
                <p className="mt-1 text-[12px] text-muted">{seat.description}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <p className={labelCls}>Access method</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAccessMode("invite")}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                    accessMode === "invite"
                      ? "bg-navy text-white"
                      : "bg-[#f1f4f8] text-muted"
                  }`}
                >
                  Send invite link
                </button>
                <button
                  type="button"
                  onClick={() => setAccessMode("access")}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                    accessMode === "access"
                      ? "bg-navy text-white"
                      : "bg-[#f1f4f8] text-muted"
                  }`}
                >
                  Set password & email access
                </button>
              </div>
            </div>

            {accessMode === "access" ? (
              <div className="sm:col-span-2">
                <PasswordField
                  label="Temporary password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </div>
            ) : (
              <p className="sm:col-span-2 text-[12.5px] text-muted">
                They receive an invite email, create/sign in with that address,
                and join as {seat?.label ?? "the selected role"}.
              </p>
            )}
          </div>
        </section>

        {error ? (
          <p className="text-[12.5px] font-medium text-bad">{error}</p>
        ) : null}
        {inviteUrl ? (
          <p className="rounded-lg bg-[#f0fdf9] px-3 py-2 text-[12.5px] text-ok">
            Invite created. Link: {inviteUrl}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create organization"}
        </button>
      </form>
    </div>
  );
}
