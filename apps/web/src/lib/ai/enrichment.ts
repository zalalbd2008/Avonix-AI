import { completeChat } from "./router";
import type { CrawledPage } from "./crawl";

export type KnowledgeEnrichment = {
  summary: string;
  keywords: string[];
  categories: string[];
  faqs: Array<{ q: string; a: string }>;
};

function sampleCorpus(pages: CrawledPage[], maxChars = 12_000): string {
  const parts: string[] = [];
  let len = 0;
  for (const p of pages) {
    const bit = `[${p.title ?? p.url}]\n${p.text.slice(0, 2500)}`;
    if (len + bit.length > maxChars) break;
    parts.push(bit);
    len += bit.length;
  }
  return parts.join("\n\n---\n\n");
}

/**
 * AI enrichment after crawl — summary, keywords, categories, FAQ suggestions.
 */
export async function enrichKnowledgeFromPages(
  pages: CrawledPage[],
  businessName?: string | null,
): Promise<KnowledgeEnrichment | null> {
  const corpus = sampleCorpus(pages);
  if (corpus.length < 200) return null;

  const system = `You analyze website content for a chatbot knowledge base.
Return ONLY valid JSON with keys: summary (string, 2-3 sentences), keywords (string[] max 12), categories (string[] max 6), faqs (array of {q,a} max 8).
FAQs must be grounded in the provided content. No markdown.`;

  const user = `Business: ${businessName ?? "Unknown"}
Content samples:
${corpus}`;

  const res = await completeChat({
    system,
    messages: [{ role: "user", content: user }],
    ai: { provider: "openrouter", model: "anthropic/claude-sonnet-4", temperature: 0.2, maxTokens: 1200 },
  });

  if (!res.ok) return null;

  try {
    const raw = res.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(raw) as Partial<KnowledgeEnrichment>;
    return {
      summary: String(parsed.summary ?? "").trim().slice(0, 800),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 12)
        : [],
      categories: Array.isArray(parsed.categories)
        ? parsed.categories.map((k) => String(k).trim()).filter(Boolean).slice(0, 6)
        : [],
      faqs: Array.isArray(parsed.faqs)
        ? parsed.faqs
            .map((f) => ({
              q: String((f as { q?: string }).q ?? "").trim(),
              a: String((f as { a?: string }).a ?? "").trim(),
            }))
            .filter((f) => f.q.length >= 8 && f.a.length >= 10)
            .slice(0, 8)
        : [],
    };
  } catch {
    return null;
  }
}

/** Dedupe chunks by contentHash within a batch. */
export function dedupeChunks<T extends { contentHash: string; content: string }>(
  chunks: T[],
): T[] {
  const seen = new Set<string>();
  return chunks.filter((c) => {
    if (seen.has(c.contentHash)) return false;
    seen.add(c.contentHash);
    return c.content.length >= 25;
  });
}
