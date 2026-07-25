"use client";

import { useState, useTransition } from "react";
import { saveBillingProfile } from "@/lib/billing/actions";
import type { BillingProfile } from "@/lib/billing/profile";
import { BillingCard } from "@/components/billing/billing-ui";

export function TaxBusinessForm({
  initial,
  canEdit,
}: {
  initial: BillingProfile;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  function set<K extends keyof BillingProfile>(key: K, value: BillingProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setMsg(null);
          const r = await saveBillingProfile(form);
          setMsg(r.ok ? "Saved." : r.error);
        });
      }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <BillingCard title="Business information" icon="building">
          <div className="grid gap-3">
            <Field label="Company name" value={form.companyName} onChange={(v) => set("companyName", v)} disabled={!canEdit} />
            <Field label="Billing name" value={form.billingName} onChange={(v) => set("billingName", v)} disabled={!canEdit} />
            <Field label="Billing email" value={form.billingEmail} onChange={(v) => set("billingEmail", v)} disabled={!canEdit} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Country" value={form.country} onChange={(v) => set("country", v)} disabled={!canEdit} />
              <Field label="State" value={form.state} onChange={(v) => set("state", v)} disabled={!canEdit} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} disabled={!canEdit} />
              <Field label="ZIP code" value={form.zip} onChange={(v) => set("zip", v)} disabled={!canEdit} />
            </div>
          </div>
        </BillingCard>

        <BillingCard title="Tax" icon="invoice">
          <div className="grid gap-3">
            <Field label="Tax ID / EIN (optional)" value={form.taxId} onChange={(v) => set("taxId", v)} disabled={!canEdit} />
            <Field label="Tax exempt certificate" value={form.taxExemptNote} onChange={(v) => set("taxExemptNote", v)} disabled={!canEdit} />
            <Field label="Tax status" value={form.taxStatus} onChange={(v) => set("taxStatus", v)} disabled={!canEdit} />
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
            Checkout stays tax-inclusive. Invoices still show a tax line when
            Stripe Tax is enabled.
          </p>
        </BillingCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canEdit || pending}
          className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {msg ? <span className="text-[13px] text-muted">{msg}</span> : null}
      </div>
    </form>
  );
}

export function BillingSettingsForm({
  initial,
  canEdit,
}: {
  initial: BillingProfile;
  canEdit: boolean;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

  function set<K extends keyof BillingProfile>(key: K, value: BillingProfile[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const notifKeys = [
    ["paymentSucceeded", "Payment succeeded"],
    ["paymentFailed", "Payment failed"],
    ["upcomingRenewal", "Upcoming renewal"],
    ["invoiceReady", "Invoice ready"],
    ["planChanged", "Plan changed"],
  ] as const;

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setMsg(null);
          const r = await saveBillingProfile(form);
          setMsg(r.ok ? "Saved." : r.error);
        });
      }}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <BillingCard title="Invoice preferences" icon="invoice">
          <div className="grid gap-3">
            <Field label="Billing email" value={form.billingEmail} onChange={(v) => set("billingEmail", v)} disabled={!canEdit} />
            <Field label="Invoice language" value={form.invoiceLanguage} onChange={(v) => set("invoiceLanguage", v)} disabled={!canEdit} />
            <Field label="Invoice prefix" value={form.invoicePrefix} onChange={(v) => set("invoicePrefix", v)} disabled={!canEdit} />
            <Field label="Purchase order (PO number)" value={form.poNumber} onChange={(v) => set("poNumber", v)} disabled={!canEdit} />
            <Field label="Currency display" value={form.currencyDisplay} onChange={(v) => set("currencyDisplay", v)} disabled={!canEdit} />
          </div>
        </BillingCard>

        <BillingCard title="Notifications" icon="mail">
          <ul className="divide-y divide-[#f1f5f9]">
            {notifKeys.map(([key, label]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <span className="text-[13px] text-ink">{label}</span>
                <input
                  type="checkbox"
                  checked={form.notifications[key]}
                  disabled={!canEdit}
                  onChange={(e) =>
                    set("notifications", {
                      ...form.notifications,
                      [key]: e.target.checked,
                    })
                  }
                  className="size-4 accent-[var(--brand,#0d9488)]"
                />
              </li>
            ))}
          </ul>
        </BillingCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!canEdit || pending}
          className="rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {msg ? <span className="text-[13px] text-muted">{msg}</span> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-muted">{label}</span>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand disabled:bg-[#f8fafc]"
      />
    </label>
  );
}
