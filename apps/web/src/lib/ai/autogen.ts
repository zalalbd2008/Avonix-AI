import { crawlSite } from "./crawl";
import { enrichKnowledgeFromPages } from "./enrichment";
import { completeChat } from "./router";

export type AutogenPreview = {
  businessType: string;
  summary: string;
  systemPrompt: string;
  faqs: Array<{ q: string; a: string; label: string }>;
  actions: Array<{ label: string; action: "send_text" | "transfer_agent" | "start_form"; value?: string }>;
};

/** Analyze a website and propose chatbot setup (Nexus ai_autogen parity). */
export async function autogenWebsiteChat(
  siteUrl: string,
  businessName?: string | null,
): Promise<AutogenPreview | { error: string }> {
  const pages = await crawlSite(siteUrl);
  if (pages.length === 0) {
    return { error: "Could not crawl that website." };
  }

  const enrichment = await enrichKnowledgeFromPages(pages, businessName);
  const corpus = pages
    .slice(0, 6)
    .map((p) => `${p.title ?? ""}\n${p.text.slice(0, 1800)}`)
    .join("\n\n---\n\n")
    .slice(0, 14_000);

  const system = `You configure a website live chat assistant.
Return ONLY JSON: { businessType, summary, systemPrompt, faqs:[{q,a,label}], actions:[{label,action,value}] }.
actions.action must be send_text, transfer_agent, or start_form.
Keep labels short (under 28 chars). Ground everything in the site content.`;

  const res = await completeChat({
    system,
    messages: [
      {
        role: "user",
        content: `Site URL: ${siteUrl}\nBusiness name hint: ${businessName ?? ""}\n\n${corpus}`,
      },
    ],
    ai: { provider: "openrouter", model: "anthropic/claude-sonnet-4", temperature: 0.25, maxTokens: 1800 },
  });

  if (!res.ok) return { error: res.error };

  try {
    const raw = res.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(raw) as Partial<AutogenPreview>;
    const faqs =
      Array.isArray(parsed.faqs) && parsed.faqs.length
        ? parsed.faqs
        : (enrichment?.faqs ?? []).map((f) => ({
            ...f,
            label: f.q.slice(0, 40),
          }));

    return {
      businessType: String(parsed.businessType ?? "Local business").slice(0, 80),
      summary: String(parsed.summary ?? enrichment?.summary ?? "").slice(0, 600),
      systemPrompt: String(parsed.systemPrompt ?? "").slice(0, 4000),
      faqs: faqs.slice(0, 8).map((f) => ({
        q: String(f.q ?? f.label ?? "").trim(),
        a: String(f.a ?? "").trim(),
        label: String(f.label ?? f.q ?? "").trim().slice(0, 40),
      })),
      actions: Array.isArray(parsed.actions)
        ? parsed.actions.slice(0, 4).map((a) => ({
            label: String(a.label ?? "Contact us").slice(0, 28),
            action: (["send_text", "transfer_agent", "start_form"].includes(String(a.action))
              ? a.action
              : "send_text") as AutogenPreview["actions"][0]["action"],
            value: a.value ? String(a.value).slice(0, 200) : undefined,
          }))
        : [
            { label: "Book a Call", action: "start_form" as const },
            { label: "Talk to a human", action: "transfer_agent" as const },
          ],
    };
  } catch {
    return { error: "Could not parse AI setup suggestions." };
  }
}
