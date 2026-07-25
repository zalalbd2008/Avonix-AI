#!/usr/bin/env node
/**
 * Refresh Google Fonts catalog from fonts.google.com/metadata/fonts.
 * Writes apps/web/src/lib/fonts/google-fonts-catalog.json (CDN families only).
 *
 * Usage: node apps/web/scripts/refresh-google-fonts.mjs
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "../src/lib/fonts/google-fonts-catalog.json");

const res = await fetch("https://fonts.google.com/metadata/fonts", {
  headers: { "User-Agent": "AvonixAI-FontSync/1.0" },
});
if (!res.ok) {
  console.error("Failed to fetch Google Fonts metadata", res.status);
  process.exit(1);
}
let text = await res.text();
if (text.startsWith(")]}'")) text = text.slice(4);
const data = JSON.parse(text);
const list = data.familyMetadataList || [];
const fonts = list
  .filter((f) => f && f.family && f.isOpenSource !== false)
  .map((f) => ({ f: f.family, c: f.category || "Sans Serif" }));

const payload = {
  updatedAt: new Date().toISOString().slice(0, 10),
  source: "fonts.google.com/metadata/fonts",
  fonts,
};

writeFileSync(out, JSON.stringify(payload));
console.log(`Wrote ${fonts.length} fonts → ${out}`);
