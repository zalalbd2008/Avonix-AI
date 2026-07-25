import Link from "next/link";

/** Route: /onboarding/done */
export default function OnboardingDone() {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-[rgba(13,148,136,.12)] text-[26px] font-bold text-ok">
        ✓
      </div>
      <h1 className="text-[19px] font-bold tracking-[-0.02em]">You&apos;re set up</h1>
      <p className="mx-auto mt-1 mb-6 max-w-sm text-[13px] text-muted">
        The next form submission on that site will appear in your inbox. Nothing
        else to configure.
      </p>
      <Link
        href="/dashboard"
        className="inline-block rounded-lg bg-brand px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-dark"
      >
        Go to the dashboard
      </Link>
    </div>
  );
}
