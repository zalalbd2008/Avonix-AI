/**
 * Image OCR — Google Cloud Vision first, optional Tesseract CLI fallback.
 *
 * Env:
 * - GOOGLE_CLOUD_VISION_API_KEY or GOOGLE_API_KEY
 * - TESSERACT_BIN (optional path to `tesseract`; default looks up PATH)
 */

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_BYTES = 4 * 1024 * 1024;

export async function ocrImageBuffer(
  raw: Buffer,
  _mime = "image/jpeg",
): Promise<string> {
  if (raw.length > MAX_BYTES) {
    throw new Error("Image is too large for OCR (max 4MB).");
  }

  try {
    return await ocrViaCloudVision(raw);
  } catch (visionErr) {
    try {
      return await ocrViaTesseract(raw);
    } catch {
      throw visionErr instanceof Error
        ? visionErr
        : new Error("OCR failed.");
    }
  }
}

async function ocrViaCloudVision(raw: Buffer): Promise<string> {
  const key =
    process.env.GOOGLE_CLOUD_VISION_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  if (!key) {
    throw new Error("OCR is not configured (missing Google Vision API key).");
  }

  const b64 = raw.toString("base64");
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: b64 },
            features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OCR failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    responses?: Array<{
      fullTextAnnotation?: { text?: string };
      textAnnotations?: Array<{ description?: string }>;
    }>;
  };

  const text =
    data.responses?.[0]?.fullTextAnnotation?.text?.trim() ||
    data.responses?.[0]?.textAnnotations?.[0]?.description?.trim() ||
    "";

  if (text.length < 3) {
    throw new Error("No readable text found in that image.");
  }
  return text.slice(0, 12_000);
}

/** Local Tesseract binary fallback (no npm dependency). */
async function ocrViaTesseract(raw: Buffer): Promise<string> {
  const bin = process.env.TESSERACT_BIN?.trim() || "tesseract";
  const dir = await mkdtemp(join(tmpdir(), "avonix-ocr-"));
  const imgPath = join(dir, "input.png");
  try {
    await writeFile(imgPath, raw);
    const text = await new Promise<string>((resolve, reject) => {
      const child = spawn(bin, [imgPath, "stdout", "-l", "eng"], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => {
        out += String(d);
      });
      child.stderr.on("data", (d) => {
        err += String(d);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(err.trim() || `tesseract exited ${code}`));
          return;
        }
        resolve(out.trim());
      });
    });
    if (text.length < 3) {
      throw new Error("No readable text found in that image.");
    }
    return text.slice(0, 12_000);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function isImageFilename(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name || "");
}
