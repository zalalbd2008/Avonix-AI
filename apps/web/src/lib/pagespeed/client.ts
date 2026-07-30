/**
 * Google PageSpeed Insights API (v5) — platform API key, no OAuth redirect.
 *
 * Set `PAGESPEED_API_KEY` in apps/web/.env (Google Cloud → API key with
 * PageSpeed Insights API enabled).
 */

export type PageSpeedCache = {
  score: number | null;
  strategy: "mobile" | "desktop";
  fetchedAt: string;
  error?: string;
};

const CACHE_MS = 24 * 60 * 60 * 1000;

export function pagespeedApiKey(): string | null {
  const key = process.env.PAGESPEED_API_KEY?.trim();
  return key || null;
}

export function isPageSpeedCacheFresh(cache?: PageSpeedCache | null): boolean {
  if (!cache?.fetchedAt) return false;
  if (cache.score == null && cache.error) {
    // Retry failed lookups sooner (1h).
    return Date.now() - new Date(cache.fetchedAt).getTime() < 60 * 60 * 1000;
  }
  return Date.now() - new Date(cache.fetchedAt).getTime() < CACHE_MS;
}

export async function fetchPageSpeedScore(
  siteUrl: string,
  strategy: "mobile" | "desktop" = "mobile",
): Promise<PageSpeedCache> {
  const key = pagespeedApiKey();
  const fetchedAt = new Date().toISOString();
  if (!key) {
    return {
      score: null,
      strategy,
      fetchedAt,
      error: "PAGESPEED_API_KEY is not set.",
    };
  }

  const url = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  );
  url.searchParams.set("url", siteUrl);
  url.searchParams.set("strategy", strategy);
  url.searchParams.set("category", "performance");
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      next: { revalidate: 0 },
    });
    const body = (await res.json()) as {
      error?: { message?: string };
      lighthouseResult?: {
        categories?: { performance?: { score?: number | null } };
      };
    };

    if (!res.ok) {
      return {
        score: null,
        strategy,
        fetchedAt,
        error: body.error?.message ?? `PageSpeed HTTP ${res.status}`,
      };
    }

    const raw = body.lighthouseResult?.categories?.performance?.score;
    const score =
      typeof raw === "number" && Number.isFinite(raw)
        ? Math.round(raw * 100)
        : null;

    return { score, strategy, fetchedAt };
  } catch (e) {
    return {
      score: null,
      strategy,
      fetchedAt,
      error: e instanceof Error ? e.message : "PageSpeed request failed.",
    };
  }
}

/** Return cached score or refresh from Google and persist via `save`. */
export async function resolvePageSpeedForSite(opts: {
  siteUrl: string;
  cache?: PageSpeedCache | null;
  save?: (next: PageSpeedCache) => Promise<void>;
}): Promise<PageSpeedCache | null> {
  if (!pagespeedApiKey()) return null;
  if (isPageSpeedCacheFresh(opts.cache) && opts.cache) return opts.cache;

  const next = await fetchPageSpeedScore(opts.siteUrl, "mobile");
  if (opts.save) {
    try {
      await opts.save(next);
    } catch (e) {
      console.error("pagespeed cache save", e);
    }
  }
  return next;
}
