import { desc, eq } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { visitorTimelineEvents } from "@/lib/db/schema";

export type TimelineWrite = {
  agencyId: string;
  clientId: string;
  contactId: string;
  websiteId?: string | null;
  eventType: string;
  title: string;
  detail?: string | null;
  meta?: Record<string, unknown>;
};

export async function appendVisitorTimeline(
  input: TimelineWrite,
): Promise<void> {
  if (!input.contactId) return;
  try {
    await withAgency(input.agencyId, (tx) =>
      tx.insert(visitorTimelineEvents).values({
        agencyId: input.agencyId,
        clientId: input.clientId,
        contactId: input.contactId,
        websiteId: input.websiteId ?? null,
        eventType: input.eventType,
        title: input.title.slice(0, 200),
        detail: input.detail?.slice(0, 2000) ?? null,
        meta: input.meta ?? {},
      }),
    );
  } catch (err) {
    console.error("[timeline] append failed", err);
  }
}

export async function listVisitorTimeline(
  agencyId: string,
  contactId: string,
  limit = 60,
) {
  return withAgency(agencyId, (tx) =>
    tx
      .select({
        id: visitorTimelineEvents.id,
        eventType: visitorTimelineEvents.eventType,
        title: visitorTimelineEvents.title,
        detail: visitorTimelineEvents.detail,
        meta: visitorTimelineEvents.meta,
        createdAt: visitorTimelineEvents.createdAt,
        websiteId: visitorTimelineEvents.websiteId,
      })
      .from(visitorTimelineEvents)
      .where(eq(visitorTimelineEvents.contactId, contactId))
      .orderBy(desc(visitorTimelineEvents.createdAt))
      .limit(limit),
  );
}
