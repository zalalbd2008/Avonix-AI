/**
 * Backup cron — creates pending backup jobs for sites with scheduled backups.
 * Called from /api/cron/automation every 5 minutes.
 */

import { adminDb } from "@/lib/db/admin";
import { websites } from "@/lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import {
  mergeBackupsSettings,
  newBackupId,
  destinationLabel,
  type BackupsSettings,
  type BackupHistoryEntry,
} from "./types";

export async function processScheduledBackups(
  limit: number = 20,
): Promise<{ queued: number }> {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay();

  // Only process at the start of each hour (within the first 10 minutes)
  if (now.getUTCMinutes() > 10) {
    return { queued: 0 };
  }

  // Fetch all websites with settings
  const rows = await adminDb
    .select({
      id: websites.id,
      agencyId: websites.agencyId,
      settings: websites.settings,
      status: websites.status,
    })
    .from(websites)
    .where(isNotNull(websites.settings))
    .limit(500);

  let queued = 0;

  for (const row of rows) {
    if (queued >= limit) break;
    if (row.status !== "connected") continue;

    const backups = mergeBackupsSettings(row.settings?.backups);
    if (!backups.enabled) continue;
    if (backups.destination === "none") continue;
    if (backups.schedule === "manual") continue;

    // Check if this is the right hour
    if (backups.runHourUtc !== currentHour) continue;

    // Check if this is the right day (for weekly)
    if (backups.schedule === "weekly" && backups.runDayUtc !== currentDay) {
      continue;
    }

    // Check if there's already a pending/running job in the last hour
    const recentJob = backups.history.find((h) => {
      if (h.status !== "pending" && h.status !== "running") return false;
      const created = new Date(h.createdAt);
      return now.getTime() - created.getTime() < 60 * 60 * 1000;
    });
    if (recentJob) continue;

    // Check if a backup already succeeded this hour
    const recentSuccess = backups.history.find((h) => {
      if (h.status !== "success") return false;
      const finished = new Date(h.finishedAt ?? h.createdAt);
      return now.getTime() - finished.getTime() < 60 * 60 * 1000;
    });
    if (recentSuccess) continue;

    // Queue a new backup job
    const parts: string[] = [];
    if (backups.includeDatabase) parts.push("database");
    if (backups.includeUploads) parts.push("uploads");
    const scope = parts.length ? parts.join(" + ") : "files";

    const entry: BackupHistoryEntry = {
      id: newBackupId(),
      label: now.toISOString(),
      detail: `Scheduled ${backups.schedule} · ${scope} · ${destinationLabel(backups.destination)}`,
      status: "pending",
      destination: backups.destination,
      sizeLabel: "",
      createdAt: now.toISOString(),
    };

    const updatedHistory = [entry, ...backups.history].slice(0, 100);
    const updatedBackups: BackupsSettings = {
      ...backups,
      history: updatedHistory,
    };

    await adminDb
      .update(websites)
      .set({
        settings: { ...(row.settings ?? {}), backups: updatedBackups },
        updatedAt: now,
      })
      .where(eq(websites.id, row.id));

    queued++;
  }

  return { queued };
}
