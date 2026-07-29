import { signBackupTriggerToken } from "./trigger-token";

/**
 * Push an immediate backup trigger to the WordPress site.
 * The connector validates the token with Avonix, then runs the queued job.
 */
export async function pushBackupTriggerToSite(input: {
  siteUrl: string;
  websiteId: string;
  jobId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const rawUrl = input.siteUrl.trim();
  if (!rawUrl) {
    return { ok: false, error: "Website URL is not set." };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return { ok: false, error: "Website URL is invalid." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Website URL must be http or https." };
  }

  const token = signBackupTriggerToken({
    websiteId: input.websiteId,
    jobId: input.jobId,
  });

  const base = wordpressBaseUrl(parsed);
  // Pretty permalinks first; query-string fallback for hosts with broken rewrites.
  const endpoints = [
    `${base}/wp-json/avonix/v1/backup/run`,
    `${base}/?rest_route=/avonix/v1/backup/run`,
    `${base}/index.php?rest_route=/avonix/v1/backup/run`,
  ];

  const body = JSON.stringify({
    token,
    job_id: input.jobId,
  });

  let lastStatus = 0;
  let lastError = "";

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body,
        signal: AbortSignal.timeout(12_000),
        redirect: "follow",
      });

      if (res.status >= 200 && res.status < 300) {
        return { ok: true };
      }

      lastStatus = res.status;
      // 404 → try next endpoint style; other errors stop early.
      if (res.status !== 404) {
        return {
          ok: false,
          error: `Site returned HTTP ${res.status}. Backup will retry via connector poll.`,
        };
      }
    } catch (err) {
      lastError =
        err instanceof Error ? err.message : "Could not reach the WordPress site.";
    }
  }

  if (lastStatus === 404) {
    return {
      ok: false,
      error:
        "Site returned HTTP 404 — update the Avonix connector plugin to v1.3.2+ on WordPress (Download connector), then try again. Backup stays queued and will retry via poll.",
    };
  }

  return {
    ok: false,
    error: `${lastError || "Could not reach the WordPress site."} Backup will retry when the connector polls.`,
  };
}

/** Origin + optional subdirectory path (e.g. https://example.com/blog). */
function wordpressBaseUrl(parsed: URL): string {
  const path = parsed.pathname.replace(/\/+$/, "");
  // Strip common WordPress admin / file suffixes if someone pasted a deep URL.
  const cleaned = path
    .replace(/\/wp-admin(?:\/.*)?$/i, "")
    .replace(/\/wp-login\.php$/i, "")
    .replace(/\/index\.php$/i, "");
  return `${parsed.origin}${cleaned}`;
}
