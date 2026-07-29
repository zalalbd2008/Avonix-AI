import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { ShareReportButton } from "@/components/reports/share-report-button";
import { PageHeader } from "@/components/shell/page-header";
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
  trackedEvents,
  websites,
} from "@/lib/db/schema";
import { getShare } from "@/lib/reports/share";
import {
  mergeWebsiteEmailSettings,
  smtpStatusLabel,
} from "@/lib/website-email/types";
import { isValidWebsiteUrl } from "@/lib/websites/url";

/**
 * Route: /clients/[clientId]/websites/[websiteId]
 *
 * Prototype metric cards plus the live signals we already measure (connector,
 * clicks, pageviews, conversion, knowledge). Unbuilt modules show "—" / 0.
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

      const [[key], [leads], [chats], [formCount], [passages], eventRows] = await Promise.all([
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

  const metrics: { value: string; label: string; tone?: string }[] = [
    {
      value: connected ? "Connected" : "Waiting",
      label: "Connector",
      tone: connected ? "text-ok" : "text-warn",
    },
    {
      value: `${health} / 100`,
      label: "Health Score",
      tone: health >= 70 ? "text-ok" : health >= 40 ? "text-warn" : "text-bad",
    },
    { value: String(data.leads), label: "Leads" },
    { value: String(data.forms), label: "Forms" },
    { value: "0", label: "Popups", tone: "text-faint" },
    { value: chatbotLive ? "1" : "0", label: "Chatbot" },
    { value: String(data.chats), label: "Chat conversations" },
    { value: String(data.buttons), label: "Button clicks" },
    { value: String(data.pageviews), label: "Pageviews" },
    {
      value: conversion === null ? "—" : `${conversion}%`,
      label: "Conversion",
      tone: conversion !== null && conversion >= 5 ? "text-ok" : undefined,
    },
    {
      value: String(data.passages),
      label: "Knowledge",
      tone: data.passages > 0 ? "text-ok" : "text-warn",
    },
    { value: smtp.label, label: "SMTP Setup", tone: smtp.tone },
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
    },
    { value: "—", label: "Performance", tone: "text-faint" },
    {
      value: aiHealthy ? "Healthy" : "Needs setup",
      label: "AI Health",
      tone: aiHealthy ? "text-ok" : "text-warn",
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
            <div className={`text-2xl font-bold tracking-[-0.02em] text-ink ${m.tone ?? ""}`}>
              {m.value}
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
