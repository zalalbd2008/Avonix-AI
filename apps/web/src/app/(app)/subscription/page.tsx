import { redirect } from "next/navigation";

/** Legacy route — Subscription now lives under Plan & Subscription. */
export default function LegacySubscriptionRedirect() {
  redirect("/billing/subscription");
}
