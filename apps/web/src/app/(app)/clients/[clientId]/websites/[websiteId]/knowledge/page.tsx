import { notFound } from "next/navigation";
import { and, count, desc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { PageHeader } from "@/components/shell/page-header";
import { TrainControls } from "@/components/knowledge/train-controls";
import {
  KnowledgeAddTextForm,
  KnowledgeAddUrlForm,
  KnowledgeDeleteSourceButton,
} from "@/components/knowledge/knowledge-forms";
import { SetupBadge } from "@/components/ui/setup-badge";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import {
  knowledgeChunks,
  knowledgeCrawlRuns,
  knowledgeSources,
  websites,
} from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/knowledge
 *
 * Knowledge Studio — crawl status + custom sources. Re-index only refreshes
 * crawl chunks; custom text/URLs stay until the admin removes them.
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

    const [
      [total],
      [embedded],
      [crawlCount],
      [customCount],
      pages,
      sources,
      runs,
    ] = await Promise.all([
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(eq(knowledgeChunks.websiteId, websiteId)),
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(
          sql`${knowledgeChunks.websiteId} = ${websiteId} and ${knowledgeChunks.embedding} is not null`,
        ),
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.websiteId, websiteId),
            eq(knowledgeChunks.sourceType, "crawl"),
          ),
        ),
      tx
        .select({ n: count() })
        .from(knowledgeChunks)
        .where(
          and(
            eq(knowledgeChunks.websiteId, websiteId),
            ne(knowledgeChunks.sourceType, "crawl"),
          ),
        ),
      tx
        .select({
          url: knowledgeChunks.sourceUrl,
          sourceType: knowledgeChunks.sourceType,
          n: count(),
        })
        .from(knowledgeChunks)
        .where(eq(knowledgeChunks.websiteId, websiteId))
        .groupBy(knowledgeChunks.sourceUrl, knowledgeChunks.sourceType)
        .orderBy(desc(count()))
        .limit(50),
      tx
        .select({
          id: knowledgeSources.id,
          label: knowledgeSources.label,
          sourceType: knowledgeSources.sourceType,
          sourceUrl: knowledgeSources.sourceUrl,
          createdAt: knowledgeSources.createdAt,
        })
        .from(knowledgeSources)
        .where(
          and(
            eq(knowledgeSources.websiteId, websiteId),
            isNull(knowledgeSources.deletedAt),
            ne(knowledgeSources.sourceType, "crawl"),
          ),
        )
        .orderBy(desc(knowledgeSources.createdAt))
        .limit(40),
      tx
        .select({
          id: knowledgeCrawlRuns.id,
          status: knowledgeCrawlRuns.status,
          trigger: knowledgeCrawlRuns.trigger,
          pagesFound: knowledgeCrawlRuns.pagesFound,
          chunksWritten: knowledgeCrawlRuns.chunksWritten,
          embedded: knowledgeCrawlRuns.embedded,
          error: knowledgeCrawlRuns.error,
          startedAt: knowledgeCrawlRuns.startedAt,
          finishedAt: knowledgeCrawlRuns.finishedAt,
        })
        .from(knowledgeCrawlRuns)
        .where(eq(knowledgeCrawlRuns.websiteId, websiteId))
        .orderBy(desc(knowledgeCrawlRuns.createdAt))
        .limit(8),
    ]);

    const lastIndexed =
      (
        await tx
          .select({ at: knowledgeChunks.createdAt })
          .from(knowledgeChunks)
          .where(
            and(
              eq(knowledgeChunks.websiteId, websiteId),
              isNotNull(knowledgeChunks.createdAt),
            ),
          )
          .orderBy(desc(knowledgeChunks.createdAt))
          .limit(1)
      )[0]?.at ?? null;

    return {
      site,
      total: total.n,
      embedded: embedded.n,
      crawlCount: crawlCount.n,
      customCount: customCount.n,
      pages,
      sources,
      runs,
      lastIndexed,
    };
  });

  if (!data) notFound();

  return (
    <>
      <PageHeader
        title="Knowledge"
        subtitle={`What the assistant can read for ${data.site.name}`}
        action={
          <TrainControls clientId={clientId} websiteId={websiteId} />
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Crawl passages",
            value: String(data.crawlCount),
            badge: data.crawlCount === 0 ? ("setup" as const) : undefined,
          },
          {
            label: "Custom passages",
            value: String(data.customCount),
            badge: undefined,
          },
          {
            label: "Total passages",
            value: String(data.total),
            badge: data.total === 0 ? ("setup" as const) : undefined,
          },
          {
            label: "Semantic search",
            value: data.embedded > 0 ? "On" : "Text only",
            badge: data.embedded === 0 ? ("incomplete" as const) : undefined,
          },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-line bg-white p-4">
            <div
              className={`text-2xl font-bold tracking-tight ${m.badge ? "text-bad" : ""}`}
            >
              {m.badge ? <SetupBadge kind={m.badge} size="lg" /> : m.value}
            </div>
            <div className="mt-0.5 text-[12.5px] text-muted">{m.label}</div>
          </div>
        ))}
      </div>

      {data.total === 0 && (
        <div className="mb-5 rounded-xl border border-line bg-white px-4 py-10 text-center">
          <p className="text-[14px] font-semibold">
            <SetupBadge kind="setup" /> Nothing indexed yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted">
            Re-index the site to pull pages, or add custom text / URLs below.
            Answers stay scoped to this website only.
          </p>
        </div>
      )}

      {data.embedded === 0 && data.total > 0 && (
        <p className="mb-5 rounded-xl border border-[#ffd9bd] bg-[#fff8f3] px-4 py-3 text-[13px]">
          <b>Keyword search only.</b> Without an embedding key the assistant
          matches words rather than meaning. Set the Voyage key in Platform →
          API Configuration and re-index.
        </p>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold">Add custom text</h2>
          <p className="mt-1 mb-3 text-[12.5px] text-muted">
            Pasted notes survive site re-index. Use for FAQs, offers, or details
            missing from the crawl.
          </p>
          <KnowledgeAddTextForm clientId={clientId} websiteId={websiteId} />
        </section>
        <section className="rounded-xl border border-line bg-white p-4">
          <h2 className="text-sm font-semibold">Add custom URL</h2>
          <p className="mt-1 mb-3 text-[12.5px] text-muted">
            Index one extra page (same or other site). Not wiped when you
            re-index the main crawl.
          </p>
          <KnowledgeAddUrlForm clientId={clientId} websiteId={websiteId} />
        </section>
      </div>

      {data.sources.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
          <div className="border-b border-[#edf0f5] px-4 py-3">
            <h2 className="text-sm font-semibold">Custom sources</h2>
          </div>
          {data.sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-2.5 text-[13px] last:border-0"
            >
              <span className="shrink-0 rounded bg-[#f4f6f9] px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                {s.sourceType}
              </span>
              <span className="min-w-0 truncate font-medium">
                {s.label || s.sourceUrl || "Untitled"}
              </span>
              {s.sourceUrl && !s.sourceUrl.startsWith("custom://") && (
                <span className="hidden min-w-0 truncate text-[12px] text-faint sm:inline">
                  {s.sourceUrl}
                </span>
              )}
              <span className="ml-auto shrink-0">
                <KnowledgeDeleteSourceButton
                  clientId={clientId}
                  websiteId={websiteId}
                  sourceId={s.id}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {data.runs.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-xl border border-line bg-white">
          <div className="border-b border-[#edf0f5] px-4 py-3">
            <h2 className="text-sm font-semibold">Crawl history</h2>
          </div>
          {data.runs.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#f1f4f8] px-4 py-2.5 text-[13px] last:border-0"
            >
              <StatusDot status={r.status} />
              <span className="font-medium capitalize">{r.status}</span>
              <span className="text-[12px] text-faint">{r.trigger}</span>
              <span className="text-[12px] text-muted">
                {r.pagesFound} pages · {r.chunksWritten} passages
                {r.embedded > 0 ? ` · ${r.embedded} embedded` : ""}
              </span>
              {r.error && (
                <span className="w-full text-[12px] text-bad sm:w-auto">
                  {r.error}
                </span>
              )}
              <span className="ml-auto text-[12px] text-faint">
                {r.finishedAt
                  ? new Date(r.finishedAt).toLocaleString()
                  : r.startedAt
                    ? new Date(r.startedAt).toLocaleString()
                    : "—"}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.pages.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[#edf0f5] px-4 py-3">
            <h2 className="text-sm font-semibold">Indexed sources</h2>
            {data.lastIndexed && (
              <span className="text-[12px] text-faint sm:ml-auto">
                last updated {new Date(data.lastIndexed).toLocaleString()}
              </span>
            )}
          </div>
          {data.pages.map((p) => (
            <div
              key={`${p.sourceType}:${p.url}`}
              className="flex items-center gap-3 border-b border-[#f1f4f8] px-4 py-2.5 text-[13px] last:border-0"
            >
              <span className="shrink-0 rounded bg-[#f4f6f9] px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
                {p.sourceType}
              </span>
              <span className="truncate">{p.url}</span>
              <span className="ml-auto shrink-0 text-[12px] text-faint">
                {p.n} {p.n === 1 ? "passage" : "passages"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "succeeded"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-bad"
        : status === "running"
          ? "bg-amber-400"
          : "bg-[#c5ccd6]";
  return (
    <span className={`inline-block size-2 shrink-0 rounded-full ${color}`} />
  );
}
