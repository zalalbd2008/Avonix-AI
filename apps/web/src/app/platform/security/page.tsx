import { desc } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { requirePlatformOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { platformSecurityEvents } from "@/lib/db/schema";

/** Route: /platform/security */
export default async function PlatformSecurityPage() {
  await requirePlatformOwner();
  const events = await db
    .select()
    .from(platformSecurityEvents)
    .orderBy(desc(platformSecurityEvents.createdAt))
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Security Center"
        subtitle="Platform security events and failed recoveries"
      />
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {events.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted">
            No security events recorded yet.
          </p>
        ) : (
          events.map((e) => (
            <div
              key={e.id}
              className="border-b border-[#f1f4f8] px-4 py-3 last:border-0"
            >
              <p className="text-[13.5px] font-semibold">{e.event}</p>
              {e.detail ? (
                <p className="mt-0.5 text-[12.5px] text-muted">{e.detail}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-faint">
                {e.createdAt.toISOString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
