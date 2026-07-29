import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import {
  contacts,
  trackedEvents,
  websites,
  type WebsiteSettings,
} from "@/lib/db/schema";
import { loadReport } from "@/lib/reports/service";
import {
  mergeInsightsSettings,
  type InsightItem,
  type InsightsSettings,
  type InsightsSnapshot,
  userStatusForItem,
} from "./types";

function pctChange(current: number, previous: number): string | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return `+${current * 100}%`;
  const delta = ((current - previous) / previous) * 100;
  const rounded = Math.round(delta);
  if (rounded === 0) return "0%";
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function dayNameFromDow(dow: number): string {
  const names = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return names[dow] ?? "Weekday";
}

function formatHour(h: number): string {
  const hour = h % 24;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:00 ${suffix}`;
}

/**
 * Builds insight rows from live report data and website configuration.
 * Nothing is invented — when there is no data, the page says so plainly.
 */
export async function loadInsights(
  agencyId: string,
  websiteId: string,
  clientId: string,
  settingsPartial?: Partial<InsightsSettings> | null,
): Promise<InsightsSnapshot | null> {
  const settings = mergeInsightsSettings(settingsPartial);
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const since60 = new Date(now - 60 * 24 * 60 * 60 * 1000);

  const [report, extras] = await Promise.all([
    loadReport(agencyId, websiteId, 30),
    withAgency(agencyId, async (tx) => {
      const [site] = await tx
        .select({
          id: websites.id,
          name: websites.name,
          url: websites.url,
          settings: websites.settings,
          status: websites.status,
        })
        .from(websites)
        .where(eq(websites.id, websiteId))
        .limit(1);

      if (!site) return null;

      const leadCurrent = tx
        .select({ n: count() })
        .from(contacts)
        .where(
          and(
            eq(contacts.sourceWebsiteId, websiteId),
            gte(contacts.createdAt, since30),
          ),
        );

      const leadPrevious = tx
        .select({ n: count() })
        .from(contacts)
        .where(
          and(
            eq(contacts.sourceWebsiteId, websiteId),
            gte(contacts.createdAt, since60),
            lt(contacts.createdAt, since30),
          ),
        );

      const deviceForms = tx
        .select({
          device: trackedEvents.device,
          n: count(),
        })
        .from(trackedEvents)
        .where(
          and(
            eq(trackedEvents.websiteId, websiteId),
            eq(trackedEvents.eventType, "form"),
            gte(trackedEvents.createdAt, since30),
          ),
        )
        .groupBy(trackedEvents.device);

      const peakHour = tx
        .select({
          dow: sql<number>`extract(dow from ${contacts.createdAt})`,
          hour: sql<number>`extract(hour from ${contacts.createdAt})`,
          n: count(),
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.sourceWebsiteId, websiteId),
            gte(contacts.createdAt, since30),
          ),
        )
        .groupBy(sql`1`, sql`2`)
        .orderBy(sql`3 desc`)
        .limit(1);

      const pageLeads = tx
        .select({
          pagePath: trackedEvents.pagePath,
          views: sql<number>`count(*) filter (where ${trackedEvents.eventType} = 'pageview')`,
          forms: sql<number>`count(*) filter (where ${trackedEvents.eventType} = 'form')`,
        })
        .from(trackedEvents)
        .where(
          and(
            eq(trackedEvents.websiteId, websiteId),
            gte(trackedEvents.createdAt, since30),
          ),
        )
        .groupBy(trackedEvents.pagePath)
        .orderBy(sql`2 desc`)
        .limit(12);

      const [[currentLeads], [previousLeads], devices, [peak], pages] =
        await Promise.all([
          leadCurrent,
          leadPrevious,
          deviceForms,
          peakHour,
          pageLeads,
        ]);

      return {
        site,
        currentLeads: currentLeads?.n ?? 0,
        previousLeads: previousLeads?.n ?? 0,
        devices,
        peak,
        pages,
      };
    }),
  ]);

  if (!report || !extras) return null;

  const base = `/clients/${clientId}/websites/${websiteId}`;
  const ws = extras.site.settings ?? ({} as WebsiteSettings);
  const items: InsightItem[] = [];
  const t = report.totals;

  const leadTrend = pctChange(extras.currentLeads, extras.previousLeads);
  if (leadTrend) {
    const tone = leadTrend.startsWith("+") ? "ok" : leadTrend === "0%" ? "mut" : "warn";
    items.push({
      id: "lead-trend",
      title:
        leadTrend.startsWith("+") || leadTrend === "0%"
          ? `Leads ${leadTrend} vs the previous 30 days`
          : `Leads down ${leadTrend.replace("-", "")} vs the previous 30 days`,
      recommendation:
        leadTrend.startsWith("+")
          ? "Keep campaigns running on top pages and review which forms drove the lift."
          : "Check Reports for drop-off pages and consider a timed popup on high-traffic URLs.",
      kind: leadTrend.startsWith("+") ? "insight" : "suggestion",
      tone,
      href: `${base}/reports`,
      hrefLabel: "Open reports",
    });
  }

  if (t.pageviews === 0) {
    items.push({
      id: "no-tracking",
      title: "No page views tracked yet",
      recommendation:
        "Install or reconnect the Avonix connector so activity and conversion insights can populate.",
      kind: "fix",
      tone: "warn",
      href: `${base}/settings`,
      hrefLabel: "Connector settings",
    });
  }

  if (t.pageviews > 0 && report.conversionRate !== null && report.conversionRate < 1) {
    items.push({
      id: "low-conversion",
      title: `Conversion rate is ${report.conversionRate.toFixed(1)}% — room to improve`,
      recommendation:
        "Add a popup or CTA on your highest-traffic pages to capture visitors who do not submit a form.",
      kind: "suggestion",
      tone: "acc",
      href: `${base}/popup`,
      hrefLabel: "Design popup",
    });
  }

  const mobile =
    extras.devices.find((d) => d.device?.toLowerCase().includes("mobile"))?.n ??
    0;
  const desktop =
    extras.devices.find((d) => d.device?.toLowerCase().includes("desktop"))?.n ??
    0;
  const tablet =
    extras.devices.find((d) => d.device?.toLowerCase().includes("tablet"))?.n ??
    0;
  const formTotal = mobile + desktop + tablet;
  if (formTotal >= 5 && mobile > desktop * 1.5) {
    items.push({
      id: "mobile-forms",
      title: "Forms convert better on mobile visitors",
      recommendation:
        "Consider a mobile-first popup variant and keep form fields short on small screens.",
      kind: "suggestion",
      tone: "acc",
      href: `${base}/popup`,
      hrefLabel: "Popup studio",
    });
  }

  const topPage = report.topPages[0];
  const pageGap = extras.pages.find(
    (p) => p.pagePath === topPage?.pagePath && Number(p.views) >= 20,
  );
  if (topPage && pageGap && Number(pageGap.forms) === 0) {
    items.push({
      id: `page-gap-${topPage.pagePath.replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}`,
      title: `${topPage.pagePath} gets traffic but no form events`,
      recommendation:
        "Add a tracked form or CTA on this page — it is your busiest URL without a measured conversion path.",
      kind: "opportunity",
      tone: "warn",
      href: `${base}/forms`,
      hrefLabel: "Manage forms",
    });
  }

  if (t.chats > 0) {
    const aiTotal = t.aiReplies;
    const humanTotal = t.humanReplies;
    const resolved = aiTotal + humanTotal;
    if (resolved > 0) {
      const aiPct = Math.round((aiTotal / resolved) * 100);
      if (aiPct >= 60) {
        items.push({
          id: "chat-ai-resolution",
          title: `Chatbot handles ${aiPct}% of replies without handoff`,
          recommendation:
            "Extend trained pages to pricing and services URLs so more visitors self-serve.",
          kind: "insight",
          tone: "ok",
          href: `${base}/chat-ai`,
          hrefLabel: "Chat AI",
        });
      } else if (aiPct < 40 && t.chats >= 5) {
        items.push({
          id: "chat-handoff-heavy",
          title: "Most chat threads still need a human",
          recommendation:
            "Review knowledge sources and add FAQs for the pages that trigger handoff most often.",
          kind: "fix",
          tone: "warn",
          href: `${base}/knowledge`,
          hrefLabel: "Knowledge base",
        });
      }
    }
  }

  if (extras.peak && Number(extras.peak.n) >= 3) {
    const hour = Number(extras.peak.hour);
    const dow = Number(extras.peak.dow);
    items.push({
      id: `peak-hour-${dow}-${hour}`,
      title: `${dayNameFromDow(dow)} around ${formatHour(hour)} is your peak lead hour`,
      recommendation:
        "Schedule email follow-ups and ad campaigns to land just before this window.",
      kind: "insight",
      tone: "mut",
      href: `${base}/automation`,
      hrefLabel: "Auto rules",
    });
  }

  if (!ws.email?.enabled || !ws.email?.fromEmail?.trim()) {
    items.push({
      id: "email-unconfigured",
      title: "Outbound email is not configured",
      recommendation:
        "Connect SMTP or OAuth so lead alerts, follow-ups and automation emails can send.",
      kind: "fix",
      tone: "warn",
      href: `${base}/email`,
      hrefLabel: "SMTP setup",
    });
  }

  if (!ws.automation?.enabled) {
    items.push({
      id: "automation-off",
      title: "Auto rules are turned off",
      recommendation:
        "Enable if → then rules for new leads, missed chats and uptime alerts.",
      kind: "suggestion",
      tone: "mut",
      href: `${base}/automation`,
      hrefLabel: "Auto rules",
    });
  }

  if (ws.uptime?.enabled && !ws.email?.notifyEmail?.trim()) {
    items.push({
      id: "uptime-no-alert-email",
      title: "Uptime monitoring has no alert recipient",
      recommendation:
        "Add a notify address under SMTP Setup so downtime probes can reach someone.",
      kind: "fix",
      tone: "warn",
      href: `${base}/email`,
      hrefLabel: "Add alert email",
    });
  }

  if (extras.site.status !== "connected") {
    items.push({
      id: "site-disconnected",
      title: "Website connector is not connected",
      recommendation:
        "Reconnect the plugin so live insights reflect current traffic and leads.",
      kind: "fix",
      tone: "warn",
      href: `${base}/settings`,
      hrefLabel: "Reconnect",
    });
  }

  const hasData =
    t.pageviews > 0 ||
    t.leads > 0 ||
    t.chats > 0 ||
    extras.currentLeads > 0;

  const newCount = items.filter(
    (i) => userStatusForItem(settings, i.id) === "new",
  ).length;
  const actionCount = items.filter(
    (i) => i.kind === "suggestion" || i.kind === "fix" || i.kind === "opportunity",
  ).length;
  const appliedCount = items.filter(
    (i) => userStatusForItem(settings, i.id) === "applied",
  ).length;

  return {
    website: {
      id: report.website.id,
      name: report.website.name,
      url: report.website.url,
      clientId,
    },
    stats: {
      newCount,
      actionCount,
      leadTrend,
      appliedCount,
    },
    items,
    generatedAt: new Date().toISOString(),
    hasData,
  };
}
