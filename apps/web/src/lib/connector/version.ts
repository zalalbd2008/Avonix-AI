/**
 * The connector version this server ships.
 *
 * Kept in step with `AVONIX_VERSION` in apps/wp-connector/avonix-connector.php.
 * Two copies is one too many, but the plugin is a separate artefact that gets
 * installed on someone else's server — it cannot import from here.
 */
export const CONNECTOR_VERSION = "1.3.59";

/**
 * Compare two dotted versions. Negative when `a` is older than `b`.
 *
 * Deliberately not semver-complete: it ignores pre-release tags, which the
 * connector does not publish. Non-numeric parts sort as 0 rather than throwing,
 * because a site reporting nonsense should show as "not reported", not crash
 * the page for every other site in the list.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".");
  const pb = b.split(".");

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = Number.parseInt(pa[i] ?? "0", 10) || 0;
    const nb = Number.parseInt(pb[i] ?? "0", 10) || 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}
