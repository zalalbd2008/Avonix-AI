import { notFound } from "next/navigation";
import { count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { ReindexButton } from "@/components/reindex-button";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { knowledgeChunks, websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/knowledge
 *
 * What the assistant can actually see. Without this page a wrong answer is
 * unexplainable — the agency has no way to tell whether a page was indexed at
 * all, which turns every complaint into guesswork.
 */
export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const data = await withAgency(ctx.agencyId, async (tx) => {
    const [site] = await tx
      .select({ id: websites.id, name: websites.name, url: websites.url })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    if (!site) return null;

    const [[total], [embedded], pages, recent] = await Promise.all([
      tx.select({ n: count() }).from(knowledgeChunks).where(eq(knowledgeChunks.websiteId, websiteId)),
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(sql`${knowledgeChunks.websiteId} = ${websiteId} and ${knowledgeChunks.embedding} is not null`),
      tx
        .select({ url: knowledgeChunks.sourceUrl, n: count() })
        .from(knowledgeChunks)
        .where(eq(knowledgeChunks.websiteId, websiteId))
        .groupBy(knowledgeChunks.sourceUrl)
        .orderBy(desc(count()))
        .limit(40),
      tx
        .select({ at: knowledgeChunks.createdAt })
        .from(knowledgeChunks)
        .where(isNotNull(knowledgeChunks.createdAt))
        .orderBy(desc(knowledgeChunks.createdAt))
        .limit(1),
    ]);

    return { site, total: total.n, embedded: embedded.n, pages, lastIndexed: recent[0]?.at ?? null };
  });

  if (!data) notFound();

  return (
    <>
      <PageHeader
        title="Knowledge"
        subtitle={`What the assistant can read from ${data.site.url}`}
        action={<ReindexButton clientId={clientId} websiteId={websiteId} />}
      />

      {data.total === 0 ? (
        <div className="rounded-xl border border-line bg-white px-4 py-12 text-center">
          <p className="text-[14px] font-semibold">Nothing indexed yet</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted">
            The assistant answers only from this site&apos;s own pages. Until they
            are indexed it will say it does not know and offer to pass questions
            on.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Pages", value: data.pages.length },
              { label: "Passages", value: data.total },
              {
                label: "Semantic search",
                value: data.embedded > 0 ? "On" : "Text only",
              },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-line bg-white p-4">
                <div className="text-2xl font-bold tracking-tight">{m.value}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">{m.label}</div>
              </div>
            ))}
          </div>

          {data.embedded === 0 && (
            <p className="mb-4 rounded-xl border border-[#ffd9bd] bg-[#fff8f3] px-4 py-3 text-[13px]">
              <b>Keyword search only.</b> Without an embedding key the assistant
              matches words rather than meaning, so &ldquo;are you open
              Saturdays?&rdquo; will not find a page titled &ldquo;Practice
              hours&rdquo;. Set VOYAGE_API_KEY and re-index to fix that.
            </p>
          )}

          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#edf0f5] px-4 py-3">
              <h2 className="text-sm font-semibold">Indexed pages</h2>
              {data.lastIndexed && (
                <span className="text-[12px] text-faint sm:ml-auto">
                  last indexed {new Date(data.lastIndexed).toLocaleString()}
                </span>
              )}
            </div>
            {data.pages.map((p) => (
              <div
                key={p.url}
                className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-2.5 text-[13px] last:border-0"
              >
                <span className="truncate">{p.url}</span>
                <span className="ml-auto shrink-0 text-[12px] text-faint">
                  {p.n} {p.n === 1 ? "passage" : "passages"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
