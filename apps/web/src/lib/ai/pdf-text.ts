/**
 * Minimal PDF text-layer extraction (no OCR, no encryption).
 * Ported conceptually from Nexus Lead Suite Pdf_Text — dependency-free.
 */

const MAX_CHARS = 120_000;

export class PdfExtractError extends Error {
  constructor(code: "not_pdf" | "encrypted" | "empty") {
    super(code);
    this.name = "PdfExtractError";
  }
}

function decodePdfLiteral(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\");
}

function hexToText(hex: string): string {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    const code = Number.parseInt(clean.slice(i, i + 2), 16);
    if (code >= 32 && code <= 126) out += String.fromCharCode(code);
    else if (code === 10 || code === 13) out += " ";
  }
  return out;
}

/** Extract visible text from a text-based PDF buffer. */
export function extractPdfText(raw: Buffer): string {
  const s = raw.toString("latin1");
  if (!s.startsWith("%PDF")) throw new PdfExtractError("not_pdf");
  if (/\/Encrypt\s+\d+\s+\d+\s+R/.test(s)) throw new PdfExtractError("encrypted");

  const parts: string[] = [];

  for (const m of s.matchAll(/\(([^()\\]{1,800}|(?:\\.|[\s\S]){0,800}?)\)\s*Tj/g)) {
    const t = decodePdfLiteral(m[1] ?? "");
    if (t.trim()) parts.push(t);
  }

  for (const m of s.matchAll(/<([0-9A-Fa-f\s]{4,2000})>\s*Tj/g)) {
    const t = hexToText(m[1] ?? "");
    if (t.trim()) parts.push(t);
  }

  for (const m of s.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    const block = m[1] ?? "";
    for (const sm of block.matchAll(/\(([^()\\]{1,400})\)/g)) {
      const t = decodePdfLiteral(sm[1] ?? "");
      if (t.trim()) parts.push(t);
    }
  }

  let text = parts.join(" ").replace(/\s+/g, " ").trim();

  if (text.length < 40) {
    const ascii = s
      .replace(/[^\x20-\x7E\n]+/g, " ")
      .replace(/\b(obj|endobj|stream|endstream|xref|trailer)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (ascii.length > text.length) text = ascii;
  }

  text = text.slice(0, MAX_CHARS).trim();
  if (text.length < 20) throw new PdfExtractError("empty");
  return text;
}
