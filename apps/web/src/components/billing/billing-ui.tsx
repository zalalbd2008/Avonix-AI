import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import {
  BillingIcon,
  type BillingIconName,
} from "@/components/billing/billing-icons";

/** Full-bleed billing page — flat white, light structure. */
export function BillingShell({
  eyebrow = "Plan & billing",
  title,
  subtitle,
  icon = "overview",
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: BillingIconName;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="-mx-6 -my-[26px] flex min-h-[calc(100vh-50px)] flex-col bg-white">
      <header className="shrink-0 border-b border-[#e8edf5] px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-10 place-items-center rounded-xl bg-[#f1f5f9] text-brand">
              <BillingIcon name={icon} className="size-5" />
            </span>
            <div>
              <p className="text-[12px] text-muted">{eyebrow}</p>
              <h1 className="text-[22px] font-bold tracking-tight text-ink">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
          {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
        </div>
      </header>
      <div className="flex-1 space-y-6 p-4 sm:p-5 lg:p-6">
        {children}
      </div>
    </div>
  );
}

/** Simple section with optional icon title — no heavy card chrome. */
export function BillingCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  icon?: BillingIconName;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[#e8edf5] ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e8edf5] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            {icon ? (
              <span className="grid size-8 place-items-center rounded-lg bg-[#f1f5f9] text-muted">
                <BillingIcon name={icon} className="size-4" />
              </span>
            ) : null}
            <div>
              {title ? (
                <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
              ) : null}
              {subtitle ? (
                <p className="text-[12px] text-muted">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {action}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

/** Label · value row with a small leading icon. */
export function InfoRow({
  icon,
  label,
  value,
}: {
  icon?: BillingIconName;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#f1f5f9] py-2.5 last:border-0">
      {icon ? (
        <span className="text-muted">
          <BillingIcon name={icon} className="size-4" />
        </span>
      ) : null}
      <span className="min-w-0 flex-1 text-[13px] text-muted">{label}</span>
      <span className="text-right text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "muted";
  children: ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "text-ok"
      : tone === "warn"
        ? "text-warn"
        : tone === "bad"
          ? "text-bad"
          : "text-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${cls}`}>
      <span
        className={`size-1.5 rounded-full ${
          tone === "ok"
            ? "bg-ok"
            : tone === "warn"
              ? "bg-warn"
              : tone === "bad"
                ? "bg-bad"
                : "bg-[#94a3b8]"
        }`}
      />
      {children}
    </span>
  );
}

export function UsageMeter({
  label,
  used,
  limit,
  icon = "chart",
}: {
  label: string;
  used: number;
  limit: number;
  icon?: BillingIconName;
}) {
  const infinite = !Number.isFinite(limit);
  const pct = infinite ? 0 : Math.min(100, (used / Math.max(limit, 1)) * 100);
  const warn = !infinite && used / limit >= 0.8;
  const over = !infinite && used >= limit;

  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center gap-2 text-[13px]">
        <span className="text-muted">
          <BillingIcon name={icon} className="size-4" />
        </span>
        <span className="font-medium text-ink">{label}</span>
        <span
          className={`ml-auto tabular-nums ${
            over ? "font-semibold text-bad" : warn ? "text-warn" : "text-muted"
          }`}
        >
          {used} / {infinite ? "∞" : limit}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
        <div
          className={`h-full rounded-full ${
            over ? "bg-bad" : warn ? "bg-warn" : "bg-brand"
          }`}
          style={{ width: `${infinite ? 8 : pct}%` }}
        />
      </div>
      {warn || over ? (
        <p className="mt-1 text-[12px] text-warn">
          {over ? "Limit reached — upgrade or add capacity." : "Approaching limit."}
        </p>
      ) : null}
    </div>
  );
}

export function BillingAlert({
  tone = "warn",
  children,
}: {
  tone?: "ok" | "warn" | "bad";
  children: ReactNode;
}) {
  const wrap =
    tone === "ok"
      ? "border-[#bfe9e2] bg-[#f0fdf9] text-ok"
      : tone === "bad"
        ? "border-[#fecaca] bg-[#fef2f2] text-bad"
        : "border-[#ffd9bd] bg-[#fff8f3] text-ink";
  const iconName: BillingIconName =
    tone === "ok" ? "check" : tone === "bad" ? "warn" : "warn";
  return (
    <p
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] ${wrap}`}
    >
      <span className="mt-0.5 shrink-0">
        <BillingIcon name={iconName} className="size-4" />
      </span>
      <span className="min-w-0 leading-relaxed">{children}</span>
    </p>
  );
}

export function ComingSoonBanner({ feature }: { feature: string }) {
  return (
    <BillingAlert tone="warn">
      <b>{feature}</b> is planned for a later release. Stripe Customer Portal
      covers cards, invoices, and cancellation today.
    </BillingAlert>
  );
}

export function EmptyTable({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-[#f1f5f9] text-muted">
        <BillingIcon name="invoice" className="size-5" />
      </span>
      <p className="max-w-sm text-[13px] text-muted">{message}</p>
    </div>
  );
}

export function BillingBtn({
  href,
  children,
  variant = "primary",
}: {
  href: Route | string;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-dark"
      : variant === "outline"
        ? "border border-[#d0d7e3] bg-white text-ink hover:bg-[#f8fafc]"
        : "text-brand hover:underline";
  return (
    <Link
      href={href as Route}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[12.5px] font-semibold ${cls}`}
    >
      {children}
    </Link>
  );
}
