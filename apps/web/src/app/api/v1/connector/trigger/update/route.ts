import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { verifyBackupTriggerToken } from "@/lib/backups/trigger-token";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { mergeUpdatesSettings } from "@/lib/updates/types";

/**
 * POST /api/v1/connector/trigger/update
 *
 * WordPress validates a cloud-issued trigger token, then applies a queued
 * software update immediately.
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(
    `update-trigger:${identity.websiteId}`,
    60,
    3600,
  );
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many update triggers.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  let body: { token?: string; job_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return connectorError("bad_request", 400, "token is required.");
  }

  const payload = verifyBackupTriggerToken(token);
  if (!payload) {
    return connectorError("forbidden", 403, "Invalid or expired trigger token.");
  }

  if (payload.websiteId !== identity.websiteId) {
    return connectorError("forbidden", 403, "Token does not match this site.");
  }

  const jobId =
    typeof body.job_id === "string" && body.job_id.trim()
      ? body.job_id.trim()
      : payload.jobId;

  if (jobId !== payload.jobId) {
    return connectorError("forbidden", 403, "Job id does not match token.");
  }

  const jobOk = await withAgency(identity.agencyId, async (tx) => {
    const [site] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, identity.websiteId))
      .limit(1);
    if (!site) return false;

    const updates = mergeUpdatesSettings(site.settings?.updates);
    const job = updates.pendingActions.find((a) => a.id === jobId);
    if (!job) return false;
    return !job.status || job.status === "pending" || job.status === "running";
  });

  if (!jobOk) {
    return connectorError(
      "not_found",
      404,
      "Update job not found or already finished.",
    );
  }

  return Response.json({ status: "ok", run: true, job_id: jobId });
}
