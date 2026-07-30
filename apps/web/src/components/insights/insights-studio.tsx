"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import { ScrollTable } from "@/components/ui/scroll-table";
import {
  actionRefreshInsights,
  actionSetInsightStatus,
} from "@/lib/insights/actions";
import {
  countByUserStatus,
  insightKindLabel,
  insightToneClasses,
  mergeInsightsSettings,
  userStatusForItem,
  type InsightItem,
  type InsightUserStatus,
  type InsightsSettings,
  type InsightsSnapshot,
} from "@/lib/insights/types";

type FilterTab = "all" | InsightUserStatus;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "applied", label: "Applied" },
  { id: "dismissed", label: "Dismissed" },
];

export function InsightsStudio({
  clientId,
  websiteId,
  websiteName,
  snapshot,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  snapshot: InsightsSnapshot;
  initial?: Partial<InsightsSettings> | null;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(() =>
    mergeInsightsSettings(initial),
  );
  const [tab, setTab] = useState<FilterTab>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reportsHref = `/clients/${clientId}/websites/${websiteId}/reports`;

  const filtered = useMemo(() => {
    if (tab === "all") return snapshot.items;
    return snapshot.items.filter(
      (i) => userStatusForItem(settings, i.id) === tab,
    );
  }, [snapshot.items, settings, tab]);

  const appliedCount = countByUserStatus(snapshot.items, settings, "applied");
  const newCount = countByUserStatus(snapshot.items, settings, "new");

  function setStatus(id: string, status: InsightUserStatus) {
    const next = mergeInsightsSettings({
      ...settings,
      itemStates: {
        ...(settings.itemStates ?? {}),
        [id]: { status, at: new Date().toISOString() },
      },
    });
    setSettings(next);
    setError(null);
    startTransition(async () => {
      const res = await actionSetInsightStatus({
        websiteId,
        clientId,
        insightId: id,
        status,
        settings: next,
      });
      if (!res.ok) setError(res.error);
    });
  }

  function refresh() {
    setRefreshing(true);
    setError(null);
    startTransition(async () => {
      const res = await actionRefreshInsights({
        websiteId,
        clientId,
        settings,
      });
      setRefreshing(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const generatedLabel = settings.lastRefreshedAt
    ? new Date(settings.lastRefreshedAt).toLocaleString()
    : new Date(snapshot.generatedAt).toLocaleString();

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle={`AI-detected opportunities · ${websiteName}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {error ? (
              <span className="max-w-[220px] text-[12px] font-medium text-bad">
                {error}
              </span>
            ) : null}
            <Link
              href={reportsHref as never}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand"
            >
              Reports
            </Link>
            <button
              type="button"
              disabled={pending || refreshing}
              onClick={refresh}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {refreshing ? "Refreshing…" : "Refresh insights"}
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          value={String(newCount)}
          label="New insights"
          tone={newCount > 0 ? "text-brand" : "text-ink"}
          badge={!snapshot.hasData ? "connect" : undefined}
        />
        <Metric
          value={String(snapshot.stats.actionCount)}
          label="Suggested actions"
        />
        <Metric
          value={snapshot.stats.leadTrend ?? "—"}
          label="Leads vs last 30 days"
          tone={
            snapshot.stats.leadTrend?.startsWith("+")
              ? "text-ok"
              : snapshot.stats.leadTrend?.startsWith("-")
                ? "text-warn"
                : "text-ink"
          }
          badge={
            snapshot.stats.leadTrend == null ? "demo" : undefined
          }
        />
        <Metric
          value={String(appliedCount)}
          label="Applied this month"
          tone={appliedCount > 0 ? "text-ok" : "text-muted"}
        />
      </div>

      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          snapshot.hasData
            ? "border-ok/25 bg-ok/5"
            : "border-line bg-[#f8fafc]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            snapshot.hasData ? "bg-ok" : "bg-[#c9d2de]"
          }`}
        />
        <div className="min-w-0">
          {snapshot.hasData ? (
            <p>
              <b className="font-semibold text-ink">Live data connected.</b>{" "}
              <span className="text-muted">
                Insights are generated from the last 30 days of reports,
                leads and site configuration. Last refresh{" "}
                <span className="font-medium text-ink">{generatedLabel}</span>.
                Compare trends in{" "}
                <Link
                  href={reportsHref as never}
                  className="font-semibold text-brand hover:underline"
                >
                  Reports & analytics
                </Link>
                .
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">Waiting for traffic.</b>{" "}
              <span className="text-muted">
                Connect the plugin and wait for page views or leads — insights
                appear once there is enough history to analyze.
              </span>
            </p>
          )}
        </div>
      </div>

      <Section
        title="Opportunities"
        subtitle="Generated from this website's reports and configuration"
      >
        <div className="mb-3 flex flex-wrap gap-4 border-b border-[#edf0f5] pb-2">
          {FILTER_TABS.map((t) => {
            const count =
              t.id === "all"
                ? snapshot.items.length
                : countByUserStatus(snapshot.items, settings, t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`cursor-pointer border-b-2 px-0.5 pb-1.5 text-[13px] font-medium transition ${
                  tab === t.id
                    ? "border-brand text-brand"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
                <span className="ml-1 text-[11px] text-faint">· {count}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-faint">
            {tab === "all"
              ? "No insights yet — check back after traffic and leads accumulate."
              : `No ${tab} insights in this view.`}
          </p>
        ) : (
          <ScrollTable minWidth={720}>
            <div className="grid grid-cols-[1.4fr_1fr_auto_auto] gap-3 border-b border-[#edf0f5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
              <span>Finding</span>
              <span>Recommendation</span>
              <span>Type</span>
              <span className="text-right">Actions</span>
            </div>
            {filtered.map((item) => (
              <InsightRow
                key={item.id}
                item={item}
                status={userStatusForItem(settings, item.id)}
                pending={pending}
                onApply={() => setStatus(item.id, "applied")}
                onDismiss={() => setStatus(item.id, "dismissed")}
                onRestore={() => setStatus(item.id, "new")}
              />
            ))}
          </ScrollTable>
        )}
      </Section>
    </div>
  );
}

function InsightRow({
  item,
  status,
  pending,
  onApply,
  onDismiss,
  onRestore,
}: {
  item: InsightItem;
  status: InsightUserStatus;
  pending: boolean;
  onApply: () => void;
  onDismiss: () => void;
  onRestore: () => void;
}) {
  const tone = insightToneClasses(item.tone);
  const dim = status === "dismissed";

  return (
    <div
      className={`grid grid-cols-[1.4fr_1fr_auto_auto] items-start gap-3 border-b border-[#edf0f5] px-4 py-3.5 last:border-b-0 ${
        dim ? "opacity-60" : ""
      }`}
    >
      <div>
        <p className="text-[13.5px] font-semibold text-ink">{item.title}</p>
        {status === "applied" ? (
          <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-wide text-ok">
            Applied
          </span>
        ) : null}
      </div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        {item.recommendation}
        {item.href && item.hrefLabel ? (
          <>
            {" "}
            <Link
              href={item.href as never}
              className="font-semibold text-brand hover:underline"
            >
              {item.hrefLabel} →
            </Link>
          </>
        ) : null}
      </p>
      <span
        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.bg} ${tone.text}`}
      >
        {insightKindLabel(item.kind)}
      </span>
      <div className="flex flex-wrap justify-end gap-1.5">
        {status === "new" ? (
          <>
            <ActionBtn
              label="Apply"
              tone="brand"
              disabled={pending}
              onClick={onApply}
            />
            <ActionBtn
              label="Dismiss"
              tone="muted"
              disabled={pending}
              onClick={onDismiss}
            />
          </>
        ) : status === "applied" ? (
          <ActionBtn
            label="Undo"
            tone="muted"
            disabled={pending}
            onClick={onRestore}
          />
        ) : (
          <ActionBtn
            label="Restore"
            tone="muted"
            disabled={pending}
            onClick={onRestore}
          />
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  tone: "brand" | "muted";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold disabled:opacity-50 ${
        tone === "brand"
          ? "border-brand/30 bg-brand/5 text-brand hover:bg-brand/10"
          : "border-line text-muted hover:border-[#c3ccd9] hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function Metric({
  value,
  label,
  tone = "text-ink",
  badge,
}: {
  value: string;
  label: string;
  tone?: string;
  badge?: SetupBadgeKind;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-white px-4 pb-3.5 pt-4">
      <div
        className={`truncate text-2xl font-bold tracking-[-0.02em] ${badge ? "text-bad" : tone}`}
        title={value}
      >
        {badge ? <SetupBadge kind={badge} size="lg" /> : value}
      </div>
      <div className="mt-[3px] text-[12.5px] text-muted">{label}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="border-b border-[#edf0f5] px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
