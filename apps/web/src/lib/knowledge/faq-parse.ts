/** Parsed FAQ item for deterministic chat chips (Nexus Q:/A: paste format). */
export type ParsedFaqItem = {
  id: string;
  label: string;
  answer: string;
};

/**
 * Parse Nexus-style FAQ paste:
 *
 * Q: What are your hours?
 * A: Mon–Fri 9–5.
 */
export function parseFaqPaste(raw: string): ParsedFaqItem[] {
  const text = raw.trim();
  if (!text) return [];

  const items: ParsedFaqItem[] = [];
  const blocks = text.split(/\n(?=Q:\s)/i);

  blocks.forEach((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return;
    const match = trimmed.match(/^Q:\s*(.+?)(?:\nA:\s*([\s\S]*))?$/i);
    if (!match) return;
    const label = match[1]?.trim() ?? "";
    const answer = (match[2] ?? "").trim();
    if (!label) return;
    items.push({
      id: `faq${index + 1}`,
      label,
      answer,
    });
  });

  return items;
}
