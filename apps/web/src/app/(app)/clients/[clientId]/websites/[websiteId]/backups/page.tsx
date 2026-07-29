import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { BackupsStudio } from "@/components/backups/backups-studio";
import { requireAgency } from "@/lib/auth/session";
import {
  isGoogleDriveBackupEnabled,
  isDriveConnected,
  mergeBackupsDriveOAuth,
} from "@/lib/backups/drive-oauth";
import {
  cloudAccountLabel,
  isCloudConnected,
  isDropboxBackupEnabled,
  isOneDriveBackupEnabled,
  mergeBackupsCloudOAuth,
} from "@/lib/backups/cloud-oauth";
import { loadBackupsSnapshot } from "@/lib/backups/service";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/**
 * Route: /clients/[clientId]/websites/[websiteId]/backups
 */
export default async function BackupsPage({
  params,
}: {
  params: Promise<{ clientId: string; websiteId: string }>;
}) {
  const { clientId, websiteId } = await params;
  const ctx = await requireAgency();

  const site = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({
        id: websites.id,
        name: websites.name,
        url: websites.url,
        status: websites.status,
        settings: websites.settings,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site) notFound();

  const snapshot = loadBackupsSnapshot({
    website: {
      id: site.id,
      name: site.name,
      url: site.url,
      status: site.status,
    },
    settings: site.settings,
  });

  const drive = mergeBackupsDriveOAuth(site.settings?.backupsDriveOAuth);
  const dropbox = mergeBackupsCloudOAuth(site.settings?.backupsDropboxOAuth);
  const oneDrive = mergeBackupsCloudOAuth(site.settings?.backupsOneDriveOAuth);

  return (
    <BackupsStudio
      clientId={clientId}
      websiteId={websiteId}
      websiteName={site.name}
      snapshot={snapshot}
      initial={site.settings?.backups}
      driveAvailable={isGoogleDriveBackupEnabled()}
      driveAuth={{
        connected: isDriveConnected(drive),
        email: drive.email,
      }}
      dropboxAvailable={isDropboxBackupEnabled()}
      dropboxAuth={{
        connected: isCloudConnected(dropbox),
        email: cloudAccountLabel(dropbox),
      }}
      oneDriveAvailable={isOneDriveBackupEnabled()}
      oneDriveAuth={{
        connected: isCloudConnected(oneDrive),
        email: cloudAccountLabel(oneDrive),
      }}
    />
  );
}
