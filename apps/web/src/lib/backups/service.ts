import type { WebsiteSettings } from "@/lib/db/schema";
import { mergeBackupsDriveOAuth, isDriveConnected } from "@/lib/backups/drive-oauth";
import { mergeIntegrationsSettings } from "@/lib/integrations/types";
import {
  BACKUP_DESTINATIONS,
  destinationLabel,
  mergeBackupsSettings,
  type BackupDestinationId,
  type BackupsSnapshot,
} from "./types";

function timeAgo(d: Date | string | null) {
  if (!d) return "—";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
}

function connectedDestinations(
  ws: WebsiteSettings,
): Set<BackupDestinationId> {
  const integrations = mergeIntegrationsSettings(ws.integrations);
  const driveOAuth = mergeBackupsDriveOAuth(ws.backupsDriveOAuth);
  const connected = new Set<BackupDestinationId>(["host"]);
  for (const meta of BACKUP_DESTINATIONS) {
    if (!meta.integrationId) continue;
    if (
      meta.integrationId === "google_drive" &&
      isDriveConnected(driveOAuth)
    ) {
      connected.add("google_drive");
      continue;
    }
    const row = integrations.connections.find(
      (c) => c.id === meta.integrationId && c.connected,
    );
    if (row) connected.add(meta.id);
  }
  return connected;
}

export function loadBackupsSnapshot(input: {
  website: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
  settings?: WebsiteSettings | null;
}): BackupsSnapshot {
  const ws = input.settings ?? {};
  const backups = mergeBackupsSettings(ws.backups);
  const connected = connectedDestinations(ws);

  const destinationOptions = BACKUP_DESTINATIONS.filter((d) => d.id !== "none").map(
    (d) => ({
      id: d.id,
      label: d.label,
      connected: connected.has(d.id),
    }),
  );

  const history = [...backups.history].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const lastSuccess = history.find((h) => h.status === "success");
  const restorePoints = history.filter((h) => h.status === "success").length;
  const latestWithSize = history.find((h) => h.sizeLabel.trim());

  let lastBackupLabel = "Never";
  let lastBackupTone = "text-muted";
  if (lastSuccess) {
    lastBackupLabel = timeAgo(lastSuccess.finishedAt ?? lastSuccess.createdAt);
    lastBackupTone = "text-ok";
  } else if (history.some((h) => h.status === "pending" || h.status === "running")) {
    lastBackupLabel = "In progress";
    lastBackupTone = "text-brand";
  } else if (history.some((h) => h.status === "failed")) {
    lastBackupLabel = "Failed";
    lastBackupTone = "text-warn";
  }

  const dest =
    backups.destination !== "none"
      ? destinationLabel(backups.destination)
      : connected.has("google_drive")
        ? "Google Drive"
        : connected.has("s3")
          ? "S3"
          : connected.has("dropbox")
            ? "Dropbox"
            : connected.has("onedrive")
              ? "OneDrive"
              : connected.has("host")
                ? "Host"
                : "—";

  return {
    website: input.website,
    stats: {
      lastBackupLabel,
      lastBackupTone,
      restorePoints,
      sizeLabel: latestWithSize?.sizeLabel ?? "—",
      destinationLabel: dest,
    },
    destinationOptions,
    history,
  };
}
