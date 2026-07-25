#!/usr/bin/env node
/**
 * Regenerate Font Awesome Free catalog for Button Design Studio.
 *
 * Usage:
 *   node scripts/generate-fa-catalog.mjs
 *   FA_VERSION=6.5.2 node scripts/generate-fa-catalog.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = process.env.FA_VERSION || "6.5.2";
const url = `https://raw.githubusercontent.com/FortAwesome/Font-Awesome/${VERSION}/metadata/icons.json`;
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "../src/lib/cta/data/fa-catalog.json");

const res = await fetch(url);
if (!res.ok) {
  console.error(`Failed to fetch ${url}: ${res.status}`);
  process.exit(1);
}

const raw = await res.json();
const out = [];

for (const [name, meta] of Object.entries(raw)) {
  const free = Array.isArray(meta.free) ? meta.free : [];
  for (const style of free) {
    if (style !== "solid" && style !== "regular" && style !== "brands") continue;
    out.push({
      name,
      label: meta.label || name,
      style,
      tags: Array.isArray(meta.search?.terms)
        ? meta.search.terms.slice(0, 12)
        : [],
    });
  }
}

out.sort(
  (a, b) => a.name.localeCompare(b.name) || a.style.localeCompare(b.style),
);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out));
console.log(
  `Wrote ${out.length} free icons (FA ${VERSION}) → ${outPath}`,
);
