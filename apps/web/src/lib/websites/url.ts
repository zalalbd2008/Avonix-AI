/**
 * Website address rules for create / update / dashboard access.
 * A site identity is scheme + host only (no path/query).
 */

export function parseWebsiteUrl(input: string): string | null {
  let raw = input.trim();
  if (!raw || /\s/.test(raw)) return null;

  // Reject obvious non-web schemes before URL() soft-parses them.
  if (/^(javascript|data|file|about|blob):/i.test(raw)) return null;

  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".localhost")) return null;

    // Allow IPv4 for local WordPress installs (e.g. http://192.168.1.10).
    if (isIpv4(host)) {
      return `${url.protocol}//${url.host}`;
    }

    // Domain: one or more dots, DNS-safe labels, alphabetic TLD (min 2).
    if (
      !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(
        host,
      )
    ) {
      return null;
    }

    const labels = host.split(".");
    const tld = labels[labels.length - 1] ?? "";
    if (!/^[a-z]{2,24}$/i.test(tld)) return null;

    // Reject single-label leftovers and leading/trailing dots already covered.
    if (labels.some((l) => l.length === 0 || l.length > 63)) return null;

    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function isValidWebsiteUrl(input: string): boolean {
  return parseWebsiteUrl(input) !== null;
}

export const WEBSITE_URL_ERROR =
  "Enter a valid website URL (e.g. harbourdental.com or https://harbourdental.com).";

function isIpv4(host: string): boolean {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return false;
  return host.split(".").every((part) => {
    const n = Number(part);
    return n >= 0 && n <= 255;
  });
}
