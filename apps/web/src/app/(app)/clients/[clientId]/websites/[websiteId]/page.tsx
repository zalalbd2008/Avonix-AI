import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { ShareReportButton } from "@/components/reports/share-report-button";
import { PageHeader } from "@/components/shell/page-header";
import {
  SetupBadge,
  type SetupBadgeKind,
} from "@/components/ui/setup-badge";
import { FixWebsiteUrlForm } from "@/components/websites/fix-website-url-form";
import { requireAgency } from "@/lib/auth/session";
import { accessibilityScore, mergeAccessibilitySettings } from "@/lib/accessibility/types";
import { withAgency } from "@/lib/db";
import {
  connectorKeys,
  contacts,
  conversations,
  forms,
  knowledgeChunks,
  popups,
  trackedEvents,
  websites,
} from "@/lib/db/schema";
import { getShare } from "@/lib/reports/share";
import {
  pagespeedApiKey,
  resolvePageSpeedForSite,
} from "@/lib/pagespeed/client";
import {
  mergeWebsiteEmailSettings,
  smtpStatusLabel,
} from "@/lib/website-email/types";
import { isValidWebsiteUrl } from "@/lib/websites/url";

/**
 * Route: /clients/[clientId]/websites/[websiteId]
 *
 * Live website signals (connector, forms, popups, chats, knowledge, etc.).
 * Modules that are still placeholders show "—" / setup badges.
 */
export default async function WebsiteOverviewPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const [data, share] = await Promise.all([
    withAgency(ctx.agencyId, async (tx) => {
      const [site] = await tx.select().from(websites).where(eq(websites.id, websiteId)).limit(1);
      if (!site) return null;

      const [[key], [leads], [chats], [formCount], [popupCount], [passages], eventRows] =
        await Promise.all([
        tx
          .select({ prefix: connectorKeys.prefix, createdAt: connectorKeys.createdAt })
          .from(connectorKeys)
          .where(and(eq(connectorKeys.websiteId, websiteId), isNull(connectorKeys.revokedAt)))
          .orderBy(desc(connectorKeys.createdAt))
          .limit(1),
        tx.select({ n: count() }).from(contacts).where(eq(contacts.sourceWebsiteId, websiteId)),
        tx
          .select({ n: count() })
          .from(conversations)
          .where(and(eq(conversations.websiteId, websiteId), eq(conversations.channel, "chat"))),
        tx.select({ n: count() }).from(forms).where(eq(forms.websiteId, websiteId)),
        tx
          .select({ n: count() })
          .from(popups)
          .where(and(eq(popups.websiteId, websiteId), isNull(popups.deletedAt))),
        tx
          .select({ n: count() })
          .from(knowledgeChunks)
          .where(eq(knowledgeChunks.websiteId, websiteId)),
        tx
          .select({ eventType: trackedEvents.eventType, n: count() })
          .from(trackedEvents)
          .where(eq(trackedEvents.websiteId, websiteId))
          .groupBy(trackedEvents.eventType),
      ]);

      const byType = Object.fromEntries(eventRows.map((r) => [r.eventType, r.n])) as Record<
        string,
        number
      >;

      return {
        site,
        key,
        leads: leads.n,
        chats: chats.n,
        forms: formCount.n,
        popups: popupCount.n,
        passages: passages.n,
        pageviews: byType.pageview ?? 0,
        buttons: byType.button ?? 0,
      };
    }),
    getShare(ctx.agencyId, websiteId),
  ]);

  if (!data) notFound();
  const { site } = data;

  if (!isValidWebsiteUrl(site.url)) {
    return (
      <FixWebsiteUrlForm
        websiteId={websiteId}
        clientId={clientId}
        currentUrl={site.url}
      />
    );
  }

  const pagespeed = await resolvePageSpeedForSite({
    siteUrl: site.url,
    cache: site.settings?.pagespeed ?? null,
    save: async (next) => {
      await withAgency(ctx.agencyId, async (tx) => {
        const [row] = await tx
          .select({ settings: websites.settings })
          .from(websites)
          .where(eq(websites.id, websiteId))
          .limit(1);
        await tx
          .update(websites)
          .set({
            settings: { ...(row?.settings ?? {}), pagespeed: next },
            updatedAt: new Date(),
          })
          .where(eq(websites.id, websiteId));
      });
    },
  });

  const connected = site.status === "connected";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const reportsHref = `/clients/${clientId}/websites/${websiteId}/reports`;

  let health = 0;
  if (data.key) health += 25;
  if (connected) health += 40;
  if (data.passages > 0) health += 20;
  if (data.leads > 0) health += 15;

  const chatbotLive = connected && data.passages > 0;
  const aiHealthy = chatbotLive;
  const conversion =
    data.pageviews > 0 ? Math.round((data.leads / data.pageviews) * 1000) / 10 : null;

  const a11y = mergeAccessibilitySettings(site.settings?.accessibility);
  const a11yScore = accessibilityScore(a11y);
  const email = mergeWebsiteEmailSettings(site.settings?.email);
  const smtp = smtpStatusLabel(email);

  const perfScore = pagespeed?.score ?? null;
  const perfConfigured = Boolean(pagespeedApiKey());

  const metrics: {
    value: string;
    label: string;
    tone?: string;
    badge?: SetupBadgeKind;
  }[] = [
    {
      value: connected ? "Connected" : "Waiting",
      label: "Connector",
      tone: connected ? "text-ok" : "text-warn",
      badge: connected ? undefined : "connect",
    },
    {
      value: `${health} / 100`,
      label: "Health Score",
      tone: health >= 70 ? "text-ok" : health >= 40 ? "text-warn" : "text-bad",
    },
    { value: String(data.leads), label: "Leads" },
    { value: String(data.forms), label: "Forms" },
    {
      value: String(data.popups),
      label: "Popups",
      badge: data.popups === 0 ? "setup" : undefined,
    },
    {
      value: chatbotLive ? "1" : "0",
      label: "Chatbot",
      badge: chatbotLive ? undefined : "setup",
    },
    { value: String(data.chats), label: "Chat conversations" },
    { value: String(data.buttons), label: "Button clicks" },
    { value: String(data.pageviews), label: "Pageviews" },
    {
      value: conversion === null ? "—" : `${conversion}%`,
      label: "Conversion",
      tone: conversion !== null && conversion >= 5 ? "text-ok" : undefined,
      badge: conversion === null ? "demo" : undefined,
    },
    {
      value: String(data.passages),
      label: "Knowledge",
      tone: data.passages > 0 ? "text-ok" : "text-warn",
      badge: data.passages === 0 ? "setup" : undefined,
    },
    {
      value: smtp.label,
      label: "SMTP Setup",
      tone: smtp.tone,
      badge:
        smtp.label === "Off"
          ? "setup"
          : smtp.label === "Incomplete" || smtp.label === "Verify OAuth"
            ? "incomplete"
            : undefined,
    },
    {
      value: a11y.enabled ? `${a11yScore}` : "—",
      label: "Accessibility Score",
      tone: a11y.enabled
        ? a11yScore >= 70
          ? "text-ok"
          : a11yScore >= 40
            ? "text-warn"
            : "text-bad"
        : "text-faint",
      badge: !a11y.enabled ? "setup" : undefined,
    },
    {
      value: perfScore != null ? String(perfScore) : "—",
      label: "Performance",
      tone:
        perfScore == null
          ? "text-faint"
          : perfScore >= 90
            ? "text-ok"
            : perfScore >= 50
              ? "text-warn"
              : "text-bad",
      badge: !perfConfigured
        ? "setup"
        : perfScore == null
          ? "incomplete"
          : undefined,
    },
    {
      value: aiHealthy ? "Healthy" : "Needs setup",
      label: "AI Health",
      tone: aiHealthy ? "text-ok" : "text-warn",
      badge: aiHealthy ? undefined : "setup",
    },
  ];

  return (
    <div>
      <PageHeader
        title={`${site.name} — Dashboard`}
        subtitle={`Everything on this page belongs to the ${site.name} website only`}
        action={
          <>
            <Link
              href={reportsHref as never}
              className="rounded-lg border-[1.5px] border-brand px-3.5 py-2 text-[13px] font-semibold text-brand hover:bg-brand hover:text-white"
            >
              View Reports
            </Link>
            <ShareReportButton
              clientId={clientId}
              websiteId={websiteId}
              appUrl={appUrl}
              slug={share?.slug ?? null}
              enabled={share?.enabled ?? true}
            />
          </>
        }
      />

      <div className="mb-[22px] grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-[10px] border border-line bg-white px-4 pt-4 pb-3.5"
          >
            <div className={`text-2xl font-bold tracking-[-0.02em] ${m.badge ? "text-bad" : `text-ink ${m.tone ?? ""}`}`}>
              {m.badge ? <SetupBadge kind={m.badge} size="lg" /> : m.value}
            </div>
            <div className="mt-[3px] text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {!connected && (
        <section className="overflow-hidden rounded-xl border border-line bg-white">
          <h2 className="border-b border-[#edf0f5] px-4 py-[13px] text-sm font-semibold">
            Install the connector
          </h2>
          <ol className="list-inside list-decimal space-y-2.5 px-4 py-4 text-[13px] text-muted">
            <li>
              <a
                href="/api/connector/download"
                className="font-semibold text-brand hover:underline"
              >
                Download the Avonix connector
              </a>{" "}
              and upload it under{" "}
              <b className="text-ink">Plugins → Add New → Upload</b> on {site.url}.
            </li>
            <li>Activate it.</li>
            <li>
              Open <b className="text-ink">Settings → Avonix AI</b> and paste the connector
              key you were shown when this website was added.
            </li>
            <li>
              Set the endpoint to{" "}
              <code className="rounded bg-[#f1f4f8] px-1.5 py-0.5 font-mono text-[12px] text-ink">
                {appUrl}
              </code>
              .
            </li>
            <li>Save. This page shows “Connected” within a few seconds.</li>
          </ol>
          {data.key && (
            <p className="border-t border-[#edf0f5] px-4 py-3 text-[12px] text-faint">
              Active key prefix <code className="font-mono text-ink">{data.key.prefix}…</code> —
              rotate it from Settings if needed.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
