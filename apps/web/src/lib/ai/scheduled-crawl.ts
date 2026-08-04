import { and, eq, isNull, sql } from "drizzle-orm";
import { adminDb } from "@/lib/db/admin";
import { knowledgeCrawlRuns, websites } from "@/lib/db/schema";
import { indexWebsite } from "./index-site";

const STALE_DAYS = 7;
const DEFAULT_LIMIT = 15;

/** Re-index websites whose last successful crawl is older than STALE_DAYS. */
export async function processScheduledKnowledgeCrawls(
  limit = DEFAULT_LIMIT,
): Promise<{ scanned: number; indexed: number; errors: string[] }> {
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const sites = await adminDb
    .select({
      id: websites.id,
      agencyId: websites.agencyId,
      url: websites.url,
      name: websites.name,
    })
    .from(websites)
    .where(isNull(websites.deletedAt))
    .limit(limit * 4);

  let scanned = 0;
  let indexed = 0;
  const errors: string[] = [];

  for (const site of sites) {
    if (indexed >= limit) break;

    const [last] = await adminDb
      .select({ finishedAt: knowledgeCrawlRuns.finishedAt })
      .from(knowledgeCrawlRuns)
      .where(
        and(
          eq(knowledgeCrawlRuns.websiteId, site.id),
          eq(knowledgeCrawlRuns.status, "succeeded"),
        ),
      )
      .orderBy(sql`${knowledgeCrawlRuns.finishedAt} desc nulls last`)
      .limit(1);

    if (last?.finishedAt && last.finishedAt > cutoff) continue;

    scanned += 1;
    try {
      const result = await indexWebsite(site.agencyId, site.id, "scheduled");
      if (result.ok) indexed += 1;
      else errors.push(`${site.url}: ${result.error}`);
    } catch (e) {
      errors.push(`${site.url}: ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return { scanned, indexed, errors };
}
