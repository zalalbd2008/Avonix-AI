import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { strToU8, zipSync } from "fflate";
import { CONNECTOR_VERSION } from "@/lib/connector/version";

/**
 * Resolve the WordPress connector source folder in the monorepo.
 * Next runs with cwd = apps/web in local/dev.
 */
export function resolveConnectorDir(): string {
  if (process.env.AVONIX_CONNECTOR_PATH) {
    return path.resolve(process.env.AVONIX_CONNECTOR_PATH);
  }
  const cwd = process.cwd();
  const candidates = [
    path.join(/* turbopackIgnore: true */ cwd, "..", "wp-connector"),
    path.join(/* turbopackIgnore: true */ cwd, "apps", "wp-connector"),
    path.join(/* turbopackIgnore: true */ cwd, "wp-connector"),
  ];
  return candidates[0];
}

async function walkFiles(
  root: string,
  dir: string,
  out: Record<string, Uint8Array>,
) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "." || entry.name === ".." || entry.name === ".DS_Store") {
      continue;
    }
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(root, abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const rel = path.relative(root, abs).split(path.sep).join("/");
    // Zip root folder name WordPress expects on upload
    out[`avonix-connector/${rel}`] = new Uint8Array(await readFile(abs));
  }
}

/** Build `avonix-connector-{version}.zip` bytes for WP Plugins → Upload. */
export async function buildConnectorZip(): Promise<{
  bytes: Uint8Array;
  filename: string;
}> {
  const root = resolveConnectorDir();
  const st = await stat(root).catch(() => null);
  if (!st?.isDirectory()) {
    throw new Error(`Connector folder not found at ${root}`);
  }

  const files: Record<string, Uint8Array> = {};
  await walkFiles(root, root, files);

  const mainPhp = files["avonix-connector/avonix-connector.php"];
  if (!mainPhp) {
    throw new Error("avonix-connector.php missing from connector folder.");
  }

  // Keep WP plugin header + AVONIX_VERSION in sync with CONNECTOR_VERSION so
  // Plugins → Upload never shows a stale "Uploaded" version.
  let phpText = new TextDecoder().decode(mainPhp);
  phpText = phpText.replace(
    /(\*\s*Version:\s*)[0-9]+(?:\.[0-9]+)*/,
    `$1${CONNECTOR_VERSION}`,
  );
  phpText = phpText.replace(
    /(define\(\s*'AVONIX_VERSION'\s*,\s*')[^']+(')/,
    `$1${CONNECTOR_VERSION}$2`,
  );
  files["avonix-connector/avonix-connector.php"] = strToU8(phpText);

  // Tiny marker so support can see which build was downloaded
  files["avonix-connector/BUILD.txt"] = strToU8(
    `Avonix AI Connector ${CONNECTOR_VERSION}\nBuilt: ${new Date().toISOString()}\n`,
  );

  const bytes = zipSync(files, { level: 6 });
  return {
    bytes,
    filename: `avonix-connector-${CONNECTOR_VERSION}.zip`,
  };
}
