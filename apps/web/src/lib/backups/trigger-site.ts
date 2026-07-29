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
    parsed = new URL(rawUrl);
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

  const endpoint = `${parsed.origin.replace(/\/$/, "")}/wp-json/avonix/v1/backup/run`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token,
        job_id: input.jobId,
      }),
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });

    if (res.status >= 200 && res.status < 300) {
      return { ok: true };
    }

    return {
      ok: false,
      error: `Site returned HTTP ${res.status}. Backup will retry via connector poll.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not reach the WordPress site.";
    return {
      ok: false,
      error: `${message} Backup will retry when the connector polls.`,
    };
  }
}
