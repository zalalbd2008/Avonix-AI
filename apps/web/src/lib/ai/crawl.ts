/**
 * Turns a website into retrievable chunks.
 *
 * Deliberately small: fetch a handful of pages, strip the markup, split on
 * headings. A general-purpose crawler is a product of its own, and this only has
 * to handle "a small business website" well.
 */

export type CrawledPage = { url: string; title: string | null; text: string };
export type Chunk = { url: string; title: string | null; content: string };

const MAX_PAGES = 30;
const MAX_BYTES_PER_PAGE = 1_000_000;
const FETCH_TIMEOUT_MS = 10_000;

/** Tags whose contents are never worth indexing. */
const STRIP_TAGS = ["script", "style", "noscript", "svg", "nav", "footer", "header", "form"];

export function htmlToText(html: string): { title: string | null; text: string } {
  let working = html;

  for (const tag of STRIP_TAGS) {
    working = working.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "gi"), " ");
  }

  const title =
    working.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ??
    working.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim() ??
    null;

  const text = working
    // Keep block boundaries so sentences from different sections do not fuse.
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title: title ? decodeEntities(title) : null, text };
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/** Same-origin links only. Following outward would index somebody else's site. */
function sameOriginLinks(html: string, base: URL): string[] {
  const found = new Set<string>();

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      if (url.origin !== base.origin) continue;
      if (!/^https?:$/.test(url.protocol)) continue;
      if (/\.(pdf|jpe?g|png|gif|svg|webp|zip|mp4|css|js)$/i.test(url.pathname)) continue;
      url.hash = "";
      url.search = "";
      found.add(url.toString());
    } catch {
      // Malformed href; skipping is the right answer.
    }
  }

  return [...found];
}

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "AvonixBot/1.0 (+https://avonix.ai/bot)" },
    });
    if (!res.ok) return null;
    if (!res.headers.get("content-type")?.includes("text/html")) return null;

    const body = await res.text();
    return body.length > MAX_BYTES_PER_PAGE ? body.slice(0, MAX_BYTES_PER_PAGE) : body;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Breadth-first crawl from the site root.
 *
 * Capped at 30 pages. Indexing an entire site would be slower, more expensive,
 * and mostly noise — a visitor's question is nearly always answered by the top
 * handful of pages.
 */
export async function crawlSite(startUrl: string): Promise<CrawledPage[]> {
  let origin: URL;
  try {
    origin = new URL(startUrl);
  } catch {
    return [];
  }

  const queue = [origin.toString()];
  const seen = new Set(queue);
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    const html = await fetchPage(url);
    if (!html) continue;

    const { title, text } = htmlToText(html);
    if (countWords(text) >= 5) pages.push({ url, title, text });

    for (const link of sameOriginLinks(html, origin)) {
      if (seen.size >= MAX_PAGES * 3) break;
      if (!seen.has(link)) {
        seen.add(link);
        queue.push(link);
      }
    }
  }

  return pages;
}

function countWords(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

const TARGET_CHARS = 1200;
const OVERLAP_CHARS = 150;

/**
 * Split a page into chunks.
 *
 * Paragraph boundaries first, with a small overlap so an answer that straddles
 * two chunks is not cut in half. ADR-005 left the numbers open; these are
 * starting values, not findings.
 */
export function chunkPage(page: CrawledPage): Chunk[] {
  const paragraphs = page.text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length > TARGET_CHARS) {
      chunks.push(current);
      // Carry the tail forward so context spanning the boundary survives.
      current = current.slice(-OVERLAP_CHARS) + "\n" + paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) chunks.push(current);

  return chunks
    .map((content) => content.trim())
    // Drop navigational scraps ("Menu", "© 2026") without dropping short but
    // real pages — a contact page may be one line, and losing it means the
    // assistant cannot answer the most common question there is. Measured in
    // words rather than characters, because a short sentence is content and a
    // long URL is not.
    .filter((content) => content.length >= 25 && countWords(content) >= 5)
    .map((content) => ({ url: page.url, title: page.title, content }));
}
