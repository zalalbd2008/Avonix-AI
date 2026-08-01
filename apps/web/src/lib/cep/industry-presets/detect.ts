/**
 * Crawl a connected website and extract brand / business signals.
 * Used only to customize an existing industry preset — never to invent a design.
 */

import { crawlSite, htmlToText } from "@/lib/ai/crawl";

export type DetectedSiteBrand = {
  url: string;
  businessName: string | null;
  categoryHints: string[];
  services: string[];
  brandColors: string[];
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  socialLinks: Array<{ network: string; url: string }>;
  primaryCta: string | null;
  faqs: Array<{ q: string; a: string }>;
  hasBooking: boolean;
  hasAppointmentLanguage: boolean;
  pageTitles: string[];
  /** Lowercased corpus used for preset keyword matching. */
  corpus: string;
  crawledPages: number;
};

const SOCIAL: Array<{ network: string; re: RegExp }> = [
  { network: "facebook", re: /facebook\.com\/[^\s"'<>]+/i },
  { network: "instagram", re: /instagram\.com\/[^\s"'<>]+/i },
  { network: "linkedin", re: /linkedin\.com\/[^\s"'<>]+/i },
  { network: "twitter", re: /(?:twitter|x)\.com\/[^\s"'<>]+/i },
  { network: "youtube", re: /youtube\.com\/[^\s"'<>]+/i },
  { network: "tiktok", re: /tiktok\.com\/[^\s"'<>]+/i },
];

const BOOKING_RE =
  /\b(book\s+(an?\s+)?(appointment|visit|consult)|schedule\s+(an?\s+)?(appointment|visit)|online\s+booking|reserve\s+a\s+(slot|time)|calendly|acuity|setmore|zocdoc)\b/i;

const CTA_LABELS =
  /\b(book\s+now|get\s+(a\s+)?quote|free\s+consult|contact\s+us|call\s+now|request\s+appointment|start\s+(a\s+)?project|get\s+started|learn\s+more)\b/gi;

const SERVICE_HINTS = [
  "emergency",
  "urgent care",
  "primary care",
  "dental",
  "orthodont",
  "optometr",
  "ophthalm",
  "lab",
  "diagnostic",
  "physical therapy",
  "mental health",
  "ob-gyn",
  "women's health",
  "implant",
  "cosmetic dentistry",
  "pediatric dentist",
  "endodont",
  "oral surgery",
  "logo design",
  "branding",
  "business card",
  "graphic design",
  "print design",
  "packaging",
  "website design",
  "wordpress",
  "seo",
  "local seo",
  "google business",
  "digital marketing",
  "social media",
  "ppc",
  "google ads",
  "roofing",
  "hvac",
  "plumbing",
  "electrician",
  "pest control",
  "cleaning",
  "landscaping",
  "garage door",
  "law firm",
  "attorney",
  "cpa",
  "accounting",
  "insurance",
  "real estate",
  "mortgage",
  "property management",
  "financial advisor",
  "consultant",
  "managed it",
  "it support",
];

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "AvonixBot/1.0 (+https://avonix.ai/bot)" },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html")) return null;
    const body = await res.text();
    return body.slice(0, 1_000_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
      "i",
    );
    const m = html.match(re) ?? html.match(alt);
    if (m?.[1]?.trim()) return decode(m[1].trim());
  }
  return null;
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function extractColors(html: string): string[] {
  const found = new Set<string>();
  const theme = pickMeta(html, ["theme-color"]);
  if (theme && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(theme)) {
    found.add(theme.toLowerCase());
  }
  for (const m of html.matchAll(
    /--(?:brand|primary|accent|main)(?:-color)?:\s*(#[0-9a-f]{3,8})/gi,
  )) {
    found.add(m[1].toLowerCase());
  }
  // Prefer hex colors that appear near "brand" / "primary" in style blocks
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((m) => m[1])
    .join("\n")
    .slice(0, 80_000);
  for (const m of styleBlocks.matchAll(/#[0-9a-f]{6}\b/gi)) {
    const hex = m[0].toLowerCase();
    if (hex === "#ffffff" || hex === "#000000" || hex === "#111111") continue;
    if (found.size >= 8) break;
    found.add(hex);
  }
  return [...found].slice(0, 6);
}

function extractLogo(html: string, base: string): string | null {
  const og = pickMeta(html, ["og:image", "twitter:image"]);
  if (og) {
    try {
      return new URL(og, base).toString();
    } catch {
      /* ignore */
    }
  }
  const apple = html.match(
    /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
  );
  if (apple?.[1]) {
    try {
      return new URL(apple[1], base).toString();
    } catch {
      /* ignore */
    }
  }
  const logoImg = html.match(
    /<img[^>]+(?:class|id|alt|src)=["'][^"']*logo[^"']*["'][^>]*>/i,
  );
  if (logoImg?.[0]) {
    const src = logoImg[0].match(/src=["']([^"']+)["']/i)?.[1];
    if (src) {
      try {
        return new URL(src, base).toString();
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

function extractPhone(text: string): string | null {
  const m = text.match(
    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/,
  );
  return m?.[0]?.trim() ?? null;
}

function extractEmail(html: string, text: string): string | null {
  const mailto = html.match(/mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i);
  if (mailto?.[1]) return mailto[1].toLowerCase();
  const m = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return m?.[0]?.toLowerCase() ?? null;
}

function extractAddress(text: string): string | null {
  const m = text.match(
    /\d{1,5}\s+[A-Za-z0-9.\s]{3,40}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?[\s,]+[A-Za-z.\s]{2,30},?\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?/i,
  );
  return m?.[0]?.replace(/\s+/g, " ").trim() ?? null;
}

function extractSocial(html: string): Array<{ network: string; url: string }> {
  const out: Array<{ network: string; url: string }> = [];
  const seen = new Set<string>();
  for (const { network, re } of SOCIAL) {
    const m = html.match(re);
    if (!m?.[0]) continue;
    const url = m[0].startsWith("http") ? m[0] : `https://${m[0]}`;
    if (seen.has(network)) continue;
    seen.add(network);
    out.push({ network, url: url.replace(/["'<>].*$/, "") });
  }
  return out;
}

function extractFaqs(text: string): Array<{ q: string; a: string }> {
  const faqs: Array<{ q: string; a: string }> = [];
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 1 && faqs.length < 8; i++) {
    const q = lines[i];
    if (!/\?$/.test(q) || q.length < 12 || q.length > 160) continue;
    const a = lines[i + 1];
    if (!a || a.length < 10 || /\?$/.test(a)) continue;
    faqs.push({ q, a: a.slice(0, 400) });
  }
  return faqs;
}

function extractServices(corpus: string): string[] {
  const lower = corpus.toLowerCase();
  return SERVICE_HINTS.filter((s) => lower.includes(s)).slice(0, 12);
}

function extractPrimaryCta(html: string, text: string): string | null {
  const fromHtml = html.match(
    /<(?:a|button)[^>]*>\s*((?:Book|Get|Schedule|Contact|Call|Start|Request)[^<]{0,40})\s*<\/(?:a|button)>/i,
  );
  if (fromHtml?.[1]) return decode(fromHtml[1]).replace(/\s+/g, " ").trim();
  const fromText = text.match(CTA_LABELS);
  return fromText?.[0] ?? null;
}

/**
 * Detect brand + business signals for preset customization.
 * Crawls up to a handful of pages (reuse of site crawler) plus homepage HTML for logos/colors.
 */
export async function detectSiteBrand(siteUrl: string): Promise<DetectedSiteBrand> {
  let origin: URL;
  try {
    origin = new URL(siteUrl);
  } catch {
    return emptyBrand(siteUrl);
  }

  const homeHtml = await fetchHtml(origin.toString());
  const pages = await crawlSite(origin.toString());
  const titles = pages.map((p) => p.title).filter(Boolean) as string[];
  const corpusParts = pages.map((p) => `${p.title ?? ""}\n${p.text}`);
  if (homeHtml) {
    const { title, text } = htmlToText(homeHtml);
    corpusParts.unshift(`${title ?? ""}\n${text}`);
  }
  const corpus = corpusParts.join("\n\n").slice(0, 200_000);
  const plain = corpus;

  const businessName =
    (homeHtml && pickMeta(homeHtml, ["og:site_name", "application-name"])) ||
    titles[0]?.split(/[|\-–—]/)[0]?.trim() ||
    null;

  const brandColors = homeHtml ? extractColors(homeHtml) : [];
  const logoUrl = homeHtml ? extractLogo(homeHtml, origin.toString()) : null;
  const phone = extractPhone(plain);
  const email = homeHtml
    ? extractEmail(homeHtml, plain)
    : extractEmail("", plain);
  const address = extractAddress(plain);
  const socialLinks = homeHtml ? extractSocial(homeHtml) : [];
  const faqs = extractFaqs(plain);
  const services = extractServices(corpus);
  const primaryCta = homeHtml
    ? extractPrimaryCta(homeHtml, plain)
    : extractPrimaryCta("", plain);
  const hasBooking = BOOKING_RE.test(corpus);
  const hasAppointmentLanguage =
    /\bappointment\b/i.test(corpus) || /\bschedule\b/i.test(corpus);

  return {
    url: origin.toString(),
    businessName,
    categoryHints: services.slice(0, 6),
    services,
    brandColors,
    logoUrl,
    phone,
    email,
    address,
    socialLinks,
    primaryCta,
    faqs,
    hasBooking,
    hasAppointmentLanguage,
    pageTitles: titles.slice(0, 20),
    corpus: corpus.toLowerCase(),
    crawledPages: pages.length,
  };
}

function emptyBrand(url: string): DetectedSiteBrand {
  return {
    url,
    businessName: null,
    categoryHints: [],
    services: [],
    brandColors: [],
    logoUrl: null,
    phone: null,
    email: null,
    address: null,
    socialLinks: [],
    primaryCta: null,
    faqs: [],
    hasBooking: false,
    hasAppointmentLanguage: false,
    pageTitles: [],
    corpus: "",
    crawledPages: 0,
  };
}
