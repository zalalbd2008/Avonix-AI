import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  mergeBackupsSettings,
  type BackupHistoryEntry,
} from "@/lib/backups/types";

/**
 * POST /api/v1/connector/commands/report
 *
 * Connector reports job completion (success / failed / running).
 */
export async function POST(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`cmd-report:${identity.websiteId}`, 120, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many reports.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  let body: {
    job_id?: string;
    status?: "success" | "failed" | "running";
    size_label?: string;
    detail?: string;
    error?: string;
  };
  try {
    body = await request.json();
  } catch {
    return connectorError("bad_request", 400, "Body must be JSON.");
  }

  if (!body.job_id || !body.status) {
    return connectorError("bad_request", 400, "job_id and status are required.");
  }

  const validStatuses = new Set(["success", "failed", "running"]);
  if (!validStatuses.has(body.status)) {
    return connectorError("bad_request", 400, "Invalid status.");
  }

  const updated = await withAgency(identity.agencyId, async (tx) => {
    const [site] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, identity.websiteId))
      .limit(1);
    if (!site) return false;

    const backups = mergeBackupsSettings(site.settings?.backups);
    const idx = backups.history.findIndex((h) => h.id === body.job_id);
    if (idx === -1) return false;

    const entry: BackupHistoryEntry = {
      ...backups.history[idx]!,
      status: body.status!,
      sizeLabel: body.size_label ?? backups.history[idx]!.sizeLabel,
      detail: body.detail ?? body.error ?? backups.history[idx]!.detail,
      finishedAt:
        body.status === "success" || body.status === "failed"
          ? new Date().toISOString()
          : backups.history[idx]!.finishedAt,
    };
    backups.history[idx] = entry;

    await tx
      .update(websites)
      .set({
        settings: { ...(site.settings ?? {}), backups },
        updatedAt: new Date(),
      })
      .where(eq(websites.id, identity.websiteId));

    return true;
  });

  if (!updated) {
    return connectorError("not_found", 404, "Job not found.");
  }

  return Response.json({ status: "ok" });
}
