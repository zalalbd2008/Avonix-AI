"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import { actionRefreshHealth } from "@/lib/health/actions";
import {
  checkColor,
  checkIcon,
  type HealthCheck,
  type HealthSnapshot,
  type HealthSummaryCard,
} from "@/lib/health/types";

export function HealthStudio({
  clientId,
  websiteId,
  websiteName,
  snapshot,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  snapshot: HealthSnapshot;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function runDiagnostics() {
    setError(null);
    startTransition(async () => {
      const res = await actionRefreshHealth({
        websiteId,
        clientId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const insightsHref = `/clients/${clientId}/websites/${websiteId}/insights`;

  return (
    <div>
      <PageHeader
        title="Website Health"
        subtitle={`${websiteName} · checked ${snapshot.checkedLabel} · zero third-party dependencies`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {error ? (
              <span className="max-w-[240px] text-[12px] font-medium text-bad">
                {error}
              </span>
            ) : null}
            <Link
              href={insightsHref as never}
              className="rounded-lg border border-[#dbe1ea] px-3 py-1.5 text-[12.5px] font-semibold text-[#3c4c66] hover:border-brand hover:text-brand"
            >
              Insights
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={runDiagnostics}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Checking…" : "Run diagnostics"}
            </button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
        <section className="flex flex-col items-center justify-center rounded-xl border border-line bg-white px-6 py-8 text-center">
          <div
            className={`text-[46px] font-bold tracking-[-0.03em] ${snapshot.scoreTone}`}
          >
            {snapshot.score}
            <span className="text-[20px] font-semibold text-faint"> / 100</span>
          </div>
          <p className="mt-1 text-[13px] font-semibold text-muted">
            Overall health score
          </p>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#edf0f5]">
            <div
              className={`h-full rounded-full transition-all ${snapshot.scoreBar}`}
              style={{ width: `${Math.max(4, snapshot.score)}%` }}
            />
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Computed from live module config — not a fabricated audit.
          </p>
        </section>

        <section className="rounded-xl border border-line bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.checks.map((check) => (
              <CheckPill key={check.id} check={check} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.cards.map((card) => (
          <SummaryCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function CheckPill({ check }: { check: HealthCheck }) {
  const inner = (
    <>
      <span className={`font-bold ${checkColor(check.status)}`}>
        {checkIcon(check.status)}
      </span>
      <span className="text-[13px] text-ink">{check.label}</span>
    </>
  );

  if (check.href) {
    return (
      <Link
        href={check.href as never}
        title={check.hint}
        className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-[#e8edf5] hover:bg-[#f8fafc]"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      title={check.hint}
      className="flex items-center gap-2 px-2 py-1.5"
    >
      {inner}
    </div>
  );
}

function summaryValueBadge(card: HealthSummaryCard): SetupBadgeKind | undefined {
  if (card.id === "domain-card" && card.value === "—") return "demo";
  if (card.id === "backup-card" && card.value === "Never") return "setup";
  if (card.id === "uptime-card" && card.value === "—") {
    return card.detail === "Monitoring off" ? "setup" : "demo";
  }
  if (card.id === "ssl-card" && (card.value === "Watch" || card.value === "—")) {
    return "setup";
  }
  return undefined;
}

function SummaryCard({ card }: { card: HealthSummaryCard }) {
  const tone =
    card.tone === "ok"
      ? "text-ok"
      : card.tone === "warn"
        ? "text-warn"
        : card.tone === "brand"
          ? "text-brand"
          : "text-muted";
  const badge = summaryValueBadge(card);

  return (
    <section className="rounded-[10px] border border-line bg-white p-4">
      <p className={`text-[12px] font-semibold ${tone}`}>{card.title}</p>
      <p className={`mt-1.5 text-[17px] font-bold ${badge ? "text-bad" : "text-ink"}`}>
        {badge ? <SetupBadge kind={badge} size="lg" /> : card.value}
      </p>
      <p className="mt-2 text-[12px] text-muted">{card.detail}</p>
      {card.href && card.hrefLabel ? (
        <Link
          href={card.href as never}
          className="mt-2 inline-block text-[12.5px] font-semibold text-brand hover:underline"
        >
          {card.hrefLabel}
        </Link>
      ) : null}
    </section>
  );
}
