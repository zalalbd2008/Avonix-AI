import { extractPdfText, PdfExtractError } from "./pdf-text";

export type ExtractedFile = {
  text: string;
  kind: "pdf" | "text" | "html" | "json" | "csv";
  filename: string;
};

const TEXT_EXT = new Set(["txt", "md", "markdown", "csv", "json", "html", "htm"]);

export function extractFileText(
  filename: string,
  raw: Buffer | string,
): ExtractedFile {
  const name = filename.trim() || "attachment";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const buf = typeof raw === "string" ? Buffer.from(raw, "utf8") : raw;

  if (ext === "pdf") {
    try {
      return { text: extractPdfText(buf), kind: "pdf", filename: name };
    } catch (e) {
      if (e instanceof PdfExtractError && e.message === "encrypted") {
        throw new Error("That PDF is password-protected.");
      }
      throw new Error("Could not read text from that PDF (it may be scanned/image-only).");
    }
  }

  if (!TEXT_EXT.has(ext)) {
    throw new Error("Unsupported file type. Try PDF, TXT, MD, CSV, HTML, or JSON.");
  }

  let text = buf.toString("utf8").slice(0, 120_000).trim();
  if (ext === "html" || ext === "htm") {
    text = text
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (text.length < 10) {
    throw new Error("That file did not contain enough readable text.");
  }

  const kind =
    ext === "json"
      ? "json"
      : ext === "csv"
        ? "csv"
        : ext === "html" || ext === "htm"
          ? "html"
          : "text";

  return { text, kind, filename: name };
}
