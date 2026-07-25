/**
 * Device and browser from a user-agent string.
 *
 * Deliberately crude: five browsers and three device classes, matched by
 * substring. A real UA parser is a dependency with a database that goes stale,
 * and this feeds a report column, not a decision. Anything unrecognised is
 * "Other" rather than a guess.
 *
 * Order matters. Edge and Chrome both claim "Chrome"; Chrome and Safari both
 * claim "Safari". Each check therefore excludes the ones that impersonate it.
 */
export function parseUserAgent(ua: string | null): {
  device: string | null;
  browser: string | null;
} {
  if (!ua) return { device: null, browser: null };

  const s = ua.toLowerCase();

  const device = /ipad|tablet/.test(s)
    ? "Tablet"
    : /mobi|iphone|android/.test(s)
      ? "Mobile"
      : "Desktop";

  const browser = s.includes("edg/")
    ? "Edge"
    : s.includes("opr/") || s.includes("opera")
      ? "Opera"
      : s.includes("firefox")
        ? "Firefox"
        : s.includes("chrome")
          ? "Chrome"
          : s.includes("safari")
            ? "Safari"
            : "Other";

  return { device, browser };
}

/**
 * Hide the last part of an address (spec §13).
 *
 * IPv4 loses its final octet, IPv6 everything after the first four groups —
 * enough to keep a city-level signal while no longer identifying a household.
 * Masking happens here, on read, so the agency's own report can still show the
 * full address when they have chosen to.
 */
export function maskIp(ip: string | null): string {
  if (!ip) return "—";

  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 4).join(":")}:…`;
  }

  const parts = ip.split(".");
  if (parts.length !== 4) return "…";
  return `${parts[0]}.${parts[1]}.${parts[2]}.…`;
}
