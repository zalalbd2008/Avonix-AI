import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { stripe } from "./stripe";

export type StripePaymentMethodRow = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

export type StripeInvoiceRow = {
  id: string;
  number: string | null;
  date: Date | null;
  planLabel: string;
  amount: string;
  tax: string;
  status: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
};

export type StripeChargeRow = {
  id: string;
  date: Date | null;
  amount: string;
  method: string;
  status: string;
  invoiceId: string | null;
  receiptUrl: string | null;
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `$${(amount / 100).toFixed(2)}`;
  }
}

async function customerIdForAgency(agencyId: string) {
  const [row] = await withAgency(agencyId, (tx) =>
    tx
      .select({ customerId: agencies.stripeCustomerId })
      .from(agencies)
      .where(eq(agencies.id, agencyId))
      .limit(1),
  );
  return row?.customerId ?? null;
}

export async function loadStripePaymentMethods(
  agencyId: string,
): Promise<StripePaymentMethodRow[]> {
  const client = stripe();
  const customerId = await customerIdForAgency(agencyId);
  if (!client || !customerId) return [];

  try {
    const customer = await client.customers.retrieve(customerId);
    if (customer.deleted) return [];
    const defaultId =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id ?? null;

    const list = await client.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 20,
    });

    return list.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? "card",
      last4: pm.card?.last4 ?? "••••",
      expMonth: pm.card?.exp_month ?? 0,
      expYear: pm.card?.exp_year ?? 0,
      isDefault: pm.id === defaultId,
    }));
  } catch (e) {
    console.error("loadStripePaymentMethods", e);
    return [];
  }
}

export async function loadStripeInvoices(
  agencyId: string,
): Promise<StripeInvoiceRow[]> {
  const client = stripe();
  const customerId = await customerIdForAgency(agencyId);
  if (!client || !customerId) return [];

  try {
    const list = await client.invoices.list({
      customer: customerId,
      limit: 50,
    });

    return list.data.map((inv) => {
      const line = inv.lines?.data?.[0];
      const planLabel = line?.description ?? "Subscription";
      const taxCents =
        typeof inv.total_taxes === "object" && Array.isArray(inv.total_taxes)
          ? inv.total_taxes.reduce((sum, t) => sum + (t.amount ?? 0), 0)
          : 0;
      return {
        id: inv.id,
        number: inv.number,
        date: inv.created ? new Date(inv.created * 1000) : null,
        planLabel,
        amount: money(inv.total ?? 0, inv.currency ?? "usd"),
        tax: money(taxCents, inv.currency ?? "usd"),
        status: inv.status ?? "unknown",
        pdfUrl: inv.invoice_pdf ?? null,
        hostedUrl: inv.hosted_invoice_url ?? null,
      };
    });
  } catch (e) {
    console.error("loadStripeInvoices", e);
    return [];
  }
}

export async function loadStripeCharges(
  agencyId: string,
): Promise<StripeChargeRow[]> {
  const client = stripe();
  const customerId = await customerIdForAgency(agencyId);
  if (!client || !customerId) return [];

  try {
    const list = await client.charges.list({
      customer: customerId,
      limit: 50,
    });

    return list.data.map((ch) => {
      const method =
        ch.payment_method_details?.card
          ? `${ch.payment_method_details.card.brand ?? "card"} ••${ch.payment_method_details.card.last4 ?? ""}`
          : ch.payment_method_details?.type ?? "—";
      const invoiceRaw = (ch as { invoice?: string | { id?: string } | null }).invoice;
      const invoiceId =
        typeof invoiceRaw === "string" ? invoiceRaw : invoiceRaw?.id ?? null;
      return {
        id: ch.id,
        date: ch.created ? new Date(ch.created * 1000) : null,
        amount: money(ch.amount ?? 0, ch.currency ?? "usd"),
        method,
        status: ch.status ?? "unknown",
        invoiceId,
        receiptUrl: ch.receipt_url ?? null,
      };
    });
  } catch (e) {
    console.error("loadStripeCharges", e);
    return [];
  }
}

export async function loadStripeBillingExtras(agencyId: string): Promise<{
  defaultMethodLabel: string;
  lastPayment: string;
  outstandingBalance: string;
}> {
  const client = stripe();
  const customerId = await customerIdForAgency(agencyId);
  if (!client || !customerId) {
    return {
      defaultMethodLabel: "None",
      lastPayment: "—",
      outstandingBalance: "$0.00",
    };
  }

  try {
    const [methods, charges, customer] = await Promise.all([
      loadStripePaymentMethods(agencyId),
      loadStripeCharges(agencyId),
      client.customers.retrieve(customerId),
    ]);
    const def = methods.find((m) => m.isDefault) ?? methods[0];
    const last = charges.find((c) => c.status === "succeeded") ?? charges[0];
    const balance =
      !customer.deleted && typeof customer.balance === "number"
        ? money(Math.abs(customer.balance), "usd")
        : "$0.00";

    return {
      defaultMethodLabel: def
        ? `${capitalize(def.brand)} ••${def.last4}`
        : "None",
      lastPayment: last ? `${last.amount} · ${formatShort(last.date)}` : "—",
      outstandingBalance:
        !customer.deleted && (customer.balance ?? 0) > 0 ? balance : "$0.00",
    };
  } catch {
    return {
      defaultMethodLabel: "None",
      lastPayment: "—",
      outstandingBalance: "$0.00",
    };
  }
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatShort(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Narrow Stripe invoice tax typing across API versions. */
export type { Stripe };
