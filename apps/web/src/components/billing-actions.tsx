"use client";

import { useState } from "react";
import {
  openBillingPortal,
  startCheckout,
  switchBillingInterval,
} from "@/lib/billing/actions";
import type { BillingInterval } from "@/lib/billing/catalog";

type BtnVariant = "primary" | "outline" | "ghost" | "danger";

const variantClass: Record<BtnVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  outline:
    "border border-[#d0d7e3] bg-white text-ink hover:border-brand hover:text-brand",
  ghost: "text-brand hover:underline",
  danger: "border border-[#fecaca] bg-white text-bad hover:bg-[#fef2f2]",
};

function ActionButton({
  label,
  pendingLabel = "Opening…",
  disabled,
  variant = "primary",
  className = "",
  onRun,
}: {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  variant?: BtnVariant;
  className?: string;
  onRun: () => Promise<{ ok: true; url?: string } | { ok: false; error: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <button
        type="button"
        disabled={pending || disabled}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await onRun();
          if (!result.ok) {
            setError(result.error);
            setPending(false);
            return;
          }
          if (result.url) {
            window.location.href = result.url;
            return;
          }
          setPending(false);
        }}
        className={`cursor-pointer rounded-lg px-3.5 py-2 text-[12.5px] font-semibold disabled:opacity-50 ${variantClass[variant]}`}
      >
        {pending ? pendingLabel : label}
      </button>
      {error ? <p className="mt-1 text-[11.5px] text-bad">{error}</p> : null}
    </span>
  );
}

export function UpgradeButton({
  plan,
  label,
  disabled,
  className = "w-full",
  variant = "primary",
  interval = "month",
}: {
  plan: "starter" | "professional" | "agency" | "enterprise";
  label: string;
  disabled?: boolean;
  className?: string;
  variant?: BtnVariant;
  interval?: BillingInterval;
}) {
  return (
    <ActionButton
      label={label}
      disabled={disabled}
      variant={variant}
      className={className}
      onRun={() => startCheckout(plan, interval)}
    />
  );
}

export function ManageBillingButton({
  label = "Manage billing",
  variant = "outline",
  className = "",
  disabled,
}: {
  label?: string;
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <ActionButton
      label={label}
      variant={variant}
      className={className}
      disabled={disabled}
      onRun={openBillingPortal}
    />
  );
}

export function PortalActionButton({
  label,
  variant = "outline",
  className = "",
  disabled,
}: {
  label: string;
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <ManageBillingButton
      label={label}
      variant={variant}
      className={className}
      disabled={disabled}
    />
  );
}

export function SwitchIntervalButton({
  interval,
  label,
  disabled,
  variant = "outline",
}: {
  interval: BillingInterval;
  label: string;
  disabled?: boolean;
  variant?: BtnVariant;
}) {
  return (
    <ActionButton
      label={label}
      pendingLabel="Updating…"
      variant={variant}
      disabled={disabled}
      onRun={async () => {
        const result = await switchBillingInterval(interval);
        if (!result.ok) return result;
        window.location.reload();
        return { ok: true as const };
      }}
    />
  );
}
