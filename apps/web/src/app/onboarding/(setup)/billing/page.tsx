import { Suspense } from "react";
import OnboardingBillingPage from "./billing-client";

/** Route: /onboarding/billing — paywall after org create / abandoned checkout */
export default function Page() {
  return (
    <Suspense
      fallback={<p className="text-[13px] text-muted">Loading billing…</p>}
    >
      <OnboardingBillingPage />
    </Suspense>
  );
}
