import { notFound } from "next/navigation";
import { loadPortalLead } from "@/lib/forms/portal";

/**
 * Route: /p/[token] — public client portal for a single form submission.
 * Token is HMAC-signed; unknown / expired tokens 404.
 */
export const dynamic = "force-dynamic";

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lead = await loadPortalLead(token);
  if (!lead) notFound();

  const brand = lead.brandName?.trim() || lead.formName;
  const scores = lead.scores;

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header className="border-b border-[#e5eaf1] bg-white px-6 py-5">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          {lead.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lead.logoUrl}
              alt=""
              className="size-10 rounded-lg object-cover"
            />
          ) : (
            <span className="grid size-10 place-items-center rounded-lg bg-[#13233c] text-[15px] font-bold text-white">
              {brand.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-bold tracking-[-0.02em] text-[#13233c]">
              {brand}
            </h1>
            <p className="truncate text-[13px] text-[#5b6b83]">
              Request status · {lead.formName}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] px-6 py-8">
        <section className="rounded-2xl border border-[#e5eaf1] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <p className="text-[12px] font-semibold tracking-[0.08em] text-[#8a97ab] uppercase">
            Status
          </p>
          <p className="mt-1 text-[22px] font-bold capitalize tracking-[-0.02em] text-[#13233c]">
            {lead.status.replace(/_/g, " ")}
          </p>
          {lead.priority ? (
            <p className="mt-1 text-[13px] text-[#5b6b83]">
              Priority: <span className="font-semibold capitalize">{lead.priority}</span>
            </p>
          ) : null}
          <p className="mt-2 text-[12.5px] text-[#8a97ab]">
            Submitted {lead.createdAt.toLocaleString()}
          </p>

          {scores ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ScoreCell label="Lead health" value={scores.leadHealth} />
              <ScoreCell label="Complexity" value={scores.complexity} />
              <ScoreCell label="Sales fit" value={scores.salesProbability} />
              <ScoreCell label="Readiness" value={scores.clientReadiness} />
            </div>
          ) : null}

          {scores?.estimatedDeliveryDays != null ? (
            <p className="mt-4 text-[13.5px] text-[#5b6b83]">
              Estimated delivery:{" "}
              <span className="font-semibold text-[#13233c]">
                ~{scores.estimatedDeliveryDays} days
              </span>
            </p>
          ) : null}

          {scores?.budgetRecommendation ? (
            <p className="mt-3 text-[13.5px] leading-relaxed text-[#5b6b83]">
              {scores.budgetRecommendation}
            </p>
          ) : null}

          {lead.summary ? (
            <p className="mt-4 rounded-xl bg-[#f8fafc] px-3 py-2.5 text-[13px] leading-relaxed text-[#5b6b83]">
              {lead.summary}
            </p>
          ) : null}
        </section>
      </main>

      <footer className="px-6 py-8 text-center text-[12px] text-[#8a97ab]">
        {!lead.hideAvonix ? <p>Powered by Avonix</p> : null}
      </footer>
    </div>
  );
}

function ScoreCell({ label, value }: { label: string; value?: number }) {
  if (value == null) return null;
  return (
    <div className="rounded-xl bg-[#f8fafc] px-3 py-2.5">
      <p className="text-[11px] font-semibold text-[#8a97ab]">{label}</p>
      <p className="mt-0.5 text-[20px] font-bold tracking-[-0.02em] text-[#13233c]">
        {value}
      </p>
    </div>
  );
}
