import Link from "next/link";
import { FEATURES } from "@/lib/marketing-content";

/** Route: /features */
export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-[1000px] px-6 py-12 pb-14">
      <h1 className="mb-1.5 text-center text-[28px] font-bold tracking-[-0.02em]">
        Everything an agency needs to work a lead
      </h1>
      <p className="mb-8 text-center text-[14px] text-muted">
        And deliberately nothing else — see what we left out
      </p>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-white p-5">
            <h3 className="mb-1.5 text-[14.5px] font-bold">{f.title}</h3>
            <p className="text-[12.5px] leading-[1.5] text-muted">{f.body}</p>
          </div>
        ))}
      </div>

      {/*
        Naming the gaps is the point. An agency evaluating this against
        GoHighLevel will find them in week one; better they find them here.
      */}
      <div className="mt-6 rounded-xl border border-line bg-white p-5">
        <h2 className="mb-2 text-[15px] font-bold">What we don&apos;t do yet</h2>
        <p className="mb-3 text-[13px] leading-[1.6] text-muted">
          Funnel and website builders, email campaigns, SMS, calendars and
          booking, courses, reputation management, and a visual automation
          builder. GoHighLevel has all of them. We would rather do the inbox
          properly than do fifteen things badly.
        </p>
        <Link href="/pricing" className="text-[13px] font-semibold text-brand hover:underline">
          See pricing →
        </Link>
      </div>
    </div>
  );
}
