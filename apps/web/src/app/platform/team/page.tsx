import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requirePlatformOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { platformAccounts, user } from "@/lib/db/schema";
import {
  countPlatformOwners,
  getPlatformSettings,
} from "@/lib/platform/owner";

/** Route: /platform/team — Platform Owner seats (max 4). */
export default async function PlatformTeamPage() {
  const me = await requirePlatformOwner();
  const [settings, used, owners] = await Promise.all([
    getPlatformSettings(),
    countPlatformOwners(),
    db
      .select({
        id: platformAccounts.id,
        userId: platformAccounts.userId,
        purpose: platformAccounts.purpose,
        label: platformAccounts.label,
        status: platformAccounts.status,
        email: user.email,
        name: user.name,
      })
      .from(platformAccounts)
      .innerJoin(user, eq(user.id, platformAccounts.userId))
      .where(eq(platformAccounts.platformOwner, true)),
  ]);

  return (
    <div>
      <PageHeader
        title="Platform Team"
        subtitle={`${used} / ${settings.maxPlatformOwners} Platform Owner seats`}
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {owners.map((o) => (
          <div
            key={o.id}
            className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-3.5 last:border-0"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-navy text-[13px] font-semibold text-white">
              {(o.name || o.email).charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-semibold">
                {o.label || o.purpose} · {o.email}
                {o.userId === me.userId ? (
                  <span className="ml-1.5 text-[11px] font-medium text-faint">
                    you
                  </span>
                ) : null}
              </span>
              <span className="block text-[12.5px] text-muted">
                {o.purpose} · {o.status}
              </span>
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[12px] text-faint">
        Add seats with <code className="text-ink">npm run platform:add-owner</code>{" "}
        (web invite with step-up auth is P1). Public signup never creates Platform
        Owners.
      </p>
    </div>
  );
}
