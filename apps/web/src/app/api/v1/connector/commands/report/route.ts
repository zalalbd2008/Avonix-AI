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

  const limit = await rateLimit(`cmd-report:${identity.websiteId}`, 300, 3600);
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
    progress?: number;
    archive_file_name?: string;
    remote_file_id?: string;
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

  const progress =
    typeof body.progress === "number" && Number.isFinite(body.progress)
      ? Math.min(100, Math.max(0, Math.round(body.progress)))
      : body.status === "success"
        ? 100
        : undefined;

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

    const prev = backups.history[idx]!;
    const entry: BackupHistoryEntry = {
      ...prev,
      status: body.status!,
      sizeLabel: body.size_label ?? prev.sizeLabel,
      detail: body.detail ?? body.error ?? prev.detail,
      progress:
        progress ??
        (body.status === "success"
          ? 100
          : body.status === "running"
            ? Math.max(prev.progress ?? 5, 5)
            : prev.progress),
      archiveFileName:
        typeof body.archive_file_name === "string" && body.archive_file_name.trim()
          ? body.archive_file_name.trim().slice(0, 180)
          : prev.archiveFileName,
      remoteFileId:
        typeof body.remote_file_id === "string" && body.remote_file_id.trim()
          ? body.remote_file_id.trim().slice(0, 128)
          : prev.remoteFileId,
      finishedAt:
        body.status === "success" || body.status === "failed"
          ? new Date().toISOString()
          : prev.finishedAt,
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
