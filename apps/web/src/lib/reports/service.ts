import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  contacts,
  conversations,
  messages,
  trackedEvents,
  websites,
} from "@/lib/db/schema";

export type ReportRange = 7 | 30 | 90;

export type ActivityRow = {
  id: string;
  eventType: "pageview" | "button" | "consultation" | "form";
  elementLabel: string | null;
  cssClass: string | null;
  purpose: string | null;
  pagePath: string;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  createdAt: Date;
};

export type ReportData = {
  website: { id: string; name: string; url: string; clientId: string };
  range: ReportRange;
  totals: {
    pageviews: number;
    buttons: number;
    consultations: number;
    formEvents: number;
    leads: number;
    chats: number;
    aiReplies: number;
    humanReplies: number;
  };
  /** Conversion rate as a percentage, or null when there is nothing to divide by. */
  conversionRate: number | null;
  daily: { day: string; n: number }[];
  topPages: { pagePath: string; views: number }[];
  activity: ActivityRow[];
};

/**
 * Everything the reports page and the shared link both render.
 *
 * One function for both so the public page cannot drift from the private one —
 * a shared report that quietly shows different numbers than the dashboard is
 * worse than no shared report.
 */
export async function loadReport(
  agencyId: string,
  websiteId: string,
  range: ReportRange = 30,
): Promise<ReportData | null> {
  const since = new Date(Date.now() - range * 24 * 60 * 60 * 1000);

  return withAgency(agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id, name: websites.name, url: websites.url, clientId: websites.clientId })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!site) return null;

    const inRange = and(
      eq(trackedEvents.websiteId, websiteId),
      gte(trackedEvents.createdAt, since),
    );

    const [byType, [leadCount], [chatCount], replyCounts, daily, topPages, activity] =
      await Promise.all([
        tx
          .select({ eventType: trackedEvents.eventType, n: count() })
          .from(trackedEvents)
          .where(inRange)
          .groupBy(trackedEvents.eventType),
        tx
          .select({ n: count() })
          .from(contacts)
          .where(and(eq(contacts.sourceWebsiteId, websiteId), gte(contacts.createdAt, since))),
        tx
          .select({ n: count() })
          .from(conversations)
          .where(
            and(
              eq(conversations.websiteId, websiteId),
              eq(conversations.channel, "chat"),
              gte(conversations.createdAt, since),
            ),
          ),
        // Who answered: the assistant or a person. Joined through conversations
        // because `messages` carries no website of its own.
        tx
          .select({ author: messages.author, n: count() })
          .from(messages)
          .innerJoin(conversations, eq(conversations.id, messages.conversationId))
          .where(
            and(eq(conversations.websiteId, websiteId), gte(messages.createdAt, since)),
          )
          .groupBy(messages.author),
        tx
          .select({
            day: sql<string>`to_char(${trackedEvents.createdAt}, 'YYYY-MM-DD')`,
            n: count(),
          })
          .from(trackedEvents)
          .where(inRange)
          .groupBy(sql`1`)
          .orderBy(sql`1`),
        tx
          .select({ pagePath: trackedEvents.pagePath, views: count() })
          .from(trackedEvents)
          .where(and(inRange, eq(trackedEvents.eventType, "pageview")))
          .groupBy(trackedEvents.pagePath)
          .orderBy(desc(count()))
          .limit(8),
        tx
          .select()
          .from(trackedEvents)
          .where(inRange)
          .orderBy(desc(trackedEvents.createdAt))
          .limit(200),
      ]);

    const typeCount = (t: string) => byType.find((b) => b.eventType === t)?.n ?? 0;
    const pageviews = typeCount("pageview");

    const authorCount = (a: string) => replyCounts.find((r) => r.author === a)?.n ?? 0;

    return {
      website: site,
      range,
      totals: {
        pageviews,
        buttons: typeCount("button"),
        consultations: typeCount("consultation"),
        formEvents: typeCount("form"),
        leads: leadCount.n,
        chats: chatCount.n,
        aiReplies: authorCount("assistant"),
        humanReplies: authorCount("agent"),
      },
      // Null rather than 0 when nothing has been tracked: "0%" reads as a
      // measured failure, and no data measured nothing at all.
      conversionRate: pageviews > 0 ? (leadCount.n / pageviews) * 100 : null,
      daily,
      topPages,
      activity: activity as ActivityRow[],
    };
  });
}
