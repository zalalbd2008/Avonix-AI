/**
 * Website → retrievable pages for Knowledge indexing.
 *
 * v2: robots.txt respect (basic Disallow), sitemap.xml seeds, image ALT text,
 * schema.org JSON-LD snippets, higher page cap. Still same-origin only.
 */

import { createHash } from "crypto";

export type CrawledPage = {
  url: string;
  title: string | null;
  text: string;
  contentHash: string;
};
export type Chunk = {
  url: string;
  title: string | null;
  content: string;
  contentHash: string;
};

const MAX_PAGES = 80;
const MAX_BYTES_PER_PAGE = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;

const STRIP_TAGS = [
  "script",
  "style",
  "noscript",
  "svg",
  "nav",
  "footer",
  "header",
  "form",
];

export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export function htmlToText(html: string): { title: string | null; text: string } {
  let working = html;

  for (const tag of STRIP_TAGS) {
    working = working.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "gi"),
      " ",
    );
  }

  const alts: string[] = [];
  for (const m of working.matchAll(/<img\b[^>]*\balt=["']([^"']+)["'][^>]*>/gi)) {
    const alt = m[1]?.trim();
    if (alt && alt.length > 2) alts.push(alt);
  }

  const jsonLdBits: string[] = [];
  for (const m of working.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const raw = m[1]?.trim();
      if (!raw) continue;
      const data = JSON.parse(raw) as unknown;
      const flat = flattenJsonLd(data);
      if (flat) jsonLdBits.push(flat);
    } catch {
      // ignore bad JSON-LD
    }
  }

  const title =
    working.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ??
    working.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim() ??
    null;

  const metaDesc =
    working
      .match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      )?.[1]
      ?.trim() ??
    working
      .match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      )?.[1]
      ?.trim() ??
    null;

  let text = working
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

  const extras = [
    metaDesc ? `Summary: ${metaDesc}` : "",
    alts.length ? `Image descriptions: ${alts.slice(0, 40).join("; ")}` : "",
    jsonLdBits.length ? `Structured data: ${jsonLdBits.join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (extras) text = `${text}\n\n${extras}`.trim();

  return { title: title ? decodeEntities(title) : null, text };
}

function flattenJsonLd(data: unknown, depth = 0): string {
  if (depth > 4 || data == null) return "";
  if (typeof data === "string") return data.slice(0, 400);
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  if (Array.isArray(data)) {
    return data
      .slice(0, 12)
      .map((x) => flattenJsonLd(x, depth + 1))
      .filter(Boolean)
      .join("; ");
  }
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const prefer = ["name", "description", "headline", "text", "about", "url"];
    const parts: string[] = [];
    for (const k of prefer) {
      if (obj[k] != null) {
        const v = flattenJsonLd(obj[k], depth + 1);
        if (v) parts.push(v);
      }
    }
    return parts.join(" — ").slice(0, 800);
  }
  return "";
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function sameOriginLinks(html: string, base: URL): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      if (url.origin !== base.origin) continue;
      if (!/^https?:$/.test(url.protocol)) continue;
      if (
        /\.(pdf|jpe?g|png|gif|svg|webp|zip|mp4|css|js|woff2?|ico)$/i.test(
          url.pathname,
        )
      ) {
        continue;
      }
      url.hash = "";
      found.add(url.toString());
    } catch {
      // skip
    }
  }
  return [...found];
}

async function fetchText(
  url: string,
  accept = "text/html,application/xhtml+xml",
): Promise<{ body: string; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "AvonixBot/1.0 (+https://avonix.ai/bot)",
        Accept: accept,
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();
    const clipped =
      body.length > MAX_BYTES_PER_PAGE
        ? body.slice(0, MAX_BYTES_PER_PAGE)
        : body;
    return { body: clipped, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Basic robots.txt Disallow parser for our user-agent / *. */
async function loadRobotsDisallow(origin: URL): Promise<string[]> {
  const res = await fetchText(
    new URL("/robots.txt", origin).toString(),
    "text/plain",
  );
  if (!res) return [];
  const lines = res.body.split(/\r?\n/);
  const disallows: string[] = [];
  let applies = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith("user-agent:")) {
      const ua = line.slice(line.indexOf(":") + 1).trim().toLowerCase();
      applies = ua === "*" || ua.includes("avonix");
      continue;
    }
    if (!applies) continue;
    if (lower.startsWith("disallow:")) {
      const path = line.slice(line.indexOf(":") + 1).trim();
      if (path) disallows.push(path);
    }
  }
  return disallows;
}

function isDisallowed(url: URL, disallows: string[]): boolean {
  const path = url.pathname || "/";
  for (const rule of disallows) {
    if (rule === "/") return true;
    if (path.startsWith(rule)) return true;
  }
  return false;
}

async function loadSitemapUrls(origin: URL, limit = 120): Promise<string[]> {
  const candidates = [
    new URL("/sitemap.xml", origin).toString(),
    new URL("/sitemap_index.xml", origin).toString(),
    new URL("/wp-sitemap.xml", origin).toString(),
  ];
  const urls: string[] = [];
  for (const sm of candidates) {
    const res = await fetchText(sm, "application/xml,text/xml,text/plain");
    if (!res) continue;
    for (const m of res.body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      try {
        const u = new URL(m[1]);
        if (u.origin !== origin.origin) continue;
        if (/\.xml$/i.test(u.pathname)) continue;
        urls.push(u.toString());
        if (urls.length >= limit) return urls;
      } catch {
        // skip
      }
    }
    if (urls.length > 0) break;
  }
  return urls;
}

/** Fetch and clean a single page (custom URL ingest — no BFS). */
export async function fetchPage(pageUrl: string): Promise<CrawledPage | null> {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  parsed.hash = "";
  const fetched = await fetchText(parsed.toString());
  if (!fetched) return null;
  const { title, text } = htmlToText(fetched.body);
  if (countWords(text) < 5) return null;
  return {
    url: parsed.toString(),
    title,
    text,
    contentHash: contentHash(text),
  };
}

/**
 * Crawl from site URL: robots → sitemap seeds → BFS.
 */
export async function crawlSite(startUrl: string): Promise<CrawledPage[]> {
  let origin: URL;
  try {
    origin = new URL(startUrl);
  } catch {
    return [];
  }

  const disallows = await loadRobotsDisallow(origin);
  const sitemapUrls = await loadSitemapUrls(origin);

  const queue: string[] = [];
  const seen = new Set<string>();

  const seed = (u: string) => {
    try {
      const parsed = new URL(u);
      if (parsed.origin !== origin.origin) return;
      if (isDisallowed(parsed, disallows)) return;
      parsed.hash = "";
      const key = parsed.toString();
      if (seen.has(key)) return;
      seen.add(key);
      queue.push(key);
    } catch {
      // skip
    }
  };

  seed(origin.toString());
  for (const u of sitemapUrls) seed(u);

  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    const fetched = await fetchText(url);
    if (!fetched) continue;
    if (!fetched.contentType.includes("text/html") && !fetched.contentType.includes("xml")) {
      // allow html even if CT missing from some hosts
      if (fetched.contentType && !fetched.contentType.includes("text/")) continue;
    }

    const { title, text } = htmlToText(fetched.body);
    if (countWords(text) >= 5) {
      pages.push({
        url,
        title,
        text,
        contentHash: contentHash(text),
      });
    }

    for (const link of sameOriginLinks(fetched.body, origin)) {
      if (seen.size >= MAX_PAGES * 4) break;
      seed(link);
    }
  }

  return pages;
}

function countWords(s: string) {
  return s.split(/\s+/).filter(Boolean).length;
}

const TARGET_CHARS = 1200;
const OVERLAP_CHARS = 150;

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
      current = current.slice(-OVERLAP_CHARS) + "\n" + paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) chunks.push(current);

  return chunks
    .map((content) => content.trim())
    .filter((content) => content.length >= 25 && countWords(content) >= 5)
    .map((content) => ({
      url: page.url,
      title: page.title,
      content,
      contentHash: contentHash(content),
    }));
}

/** Chunk arbitrary text (custom paste / extracted PDF later). */
export function chunkText(opts: {
  url: string;
  title: string | null;
  text: string;
}): Chunk[] {
  return chunkPage({
    url: opts.url,
    title: opts.title,
    text: opts.text,
    contentHash: contentHash(opts.text),
  });
}
