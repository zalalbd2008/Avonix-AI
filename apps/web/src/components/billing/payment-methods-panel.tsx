"use client";

import { useState, useTransition } from "react";
import {
  removePaymentMethod,
  setDefaultPaymentMethod,
} from "@/lib/billing/actions";
import { ManageBillingButton } from "@/components/billing-actions";
import { StatusPill } from "@/components/billing/billing-ui";
import { BillingIcon } from "@/components/billing/billing-icons";
import type { StripePaymentMethodRow } from "@/lib/billing/customer-data";

export function PaymentMethodsPanel({
  methods,
  canEdit,
}: {
  methods: StripePaymentMethodRow[];
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (methods.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-full bg-[#f1f5f9] text-muted">
            <BillingIcon name="card" className="size-5" />
          </span>
          <p className="max-w-sm text-[13px] text-muted">
            No card on file yet. Choose a plan at checkout, or open Stripe after
            your first payment.
          </p>
        </div>
        <ManageBillingButton
          label="Add card in Stripe"
          variant="primary"
          disabled={!canEdit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {error ? <p className="mb-2 text-[12.5px] text-bad">{error}</p> : null}
      {methods.map((pm) => (
        <div
          key={pm.id}
          className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] py-3 last:border-0"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-[#f1f5f9] text-muted">
              <BillingIcon name="card" className="size-4" />
            </span>
            <div>
              <p className="text-[13px] font-medium capitalize text-ink">
                {pm.brand} ••{pm.last4}
              </p>
              <p className="text-[12px] text-muted">
                Expires {pm.expMonth}/{pm.expYear}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pm.isDefault ? (
              <StatusPill tone="ok">Default</StatusPill>
            ) : (
              <button
                type="button"
                disabled={!canEdit || pending}
                onClick={() =>
                  start(async () => {
                    setError(null);
                    const r = await setDefaultPaymentMethod(pm.id);
                    if (!r.ok) setError(r.error);
                  })
                }
                className="text-[12.5px] font-semibold text-brand hover:underline disabled:opacity-50"
              >
                Make default
              </button>
            )}
            <button
              type="button"
              disabled={!canEdit || pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const r = await removePaymentMethod(pm.id);
                  if (!r.ok) setError(r.error);
                })
              }
              className="text-[12.5px] font-semibold text-bad hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <div className="pt-3">
        <ManageBillingButton label="Add / update in Stripe" disabled={!canEdit} />
      </div>
    </div>
  );
}
