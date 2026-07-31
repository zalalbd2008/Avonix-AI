import { signBackupTriggerToken } from "@/lib/backups/trigger-token";

/**
 * Wake the WordPress connector to apply a queued software update immediately.
 * Token is verified by the connector against Avonix (same HMAC as backups).
 */
export async function pushUpdateTriggerToSite(input: {
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
  const endpoints = [
    `${base}/wp-json/avonix/v1/updates/run`,
    `${base}/?rest_route=/avonix/v1/updates/run`,
    `${base}/index.php?rest_route=/avonix/v1/updates/run`,
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
      if (res.status !== 404) {
        return {
          ok: false,
          error: `Site returned HTTP ${res.status}. Update will retry via connector poll.`,
        };
      }
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.message
          : "Could not reach the WordPress site.";
    }
  }

  if (lastStatus === 404) {
    return {
      ok: false,
      error:
        "Site returned HTTP 404 — update the Avonix connector to v1.3.15+ first (manual zip once), then remote updates work. Job stays queued for poll.",
    };
  }

  return {
    ok: false,
    error: `${lastError || "Could not reach the WordPress site."} Update will retry when the connector polls.`,
  };
}

function wordpressBaseUrl(parsed: URL): string {
  const path = parsed.pathname.replace(/\/+$/, "");
  const cleaned = path
    .replace(/\/wp-admin(?:\/.*)?$/i, "")
    .replace(/\/wp-login\.php$/i, "")
    .replace(/\/index\.php$/i, "");
  return `${parsed.origin}${cleaned}`;
}
