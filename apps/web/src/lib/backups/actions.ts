"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import {
  defaultBackupFileName,
  destinationLabel,
  mergeBackupsSettings,
  newBackupId,
  sanitizeBackupFileName,
  type BackupsSettings,
} from "./types";
import {
  signDriveOauthState,
  driveOauthCallbackUrl,
  mergeBackupsDriveOAuth,
  GOOGLE_DRIVE_SCOPES,
  getGoogleDriveOAuthConfig,
  type BackupsDriveOAuth,
} from "./drive-oauth";
import { mergeIntegrationsSettings } from "@/lib/integrations/types";
import { pushBackupTriggerToSite } from "./trigger-site";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveBackups(input: {
  websiteId: string;
  clientId: string;
  settings: BackupsSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const backups = mergeBackupsSettings(input.settings);

  if (backups.enabled && backups.destination === "none") {
    return {
      ok: false,
      error: "Choose a backup destination or connect one under Integrations.",
    };
  }

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      backups,
    };

    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));

    return { ok: true as const };
  });

  if (result.ok) {
    const base = `/clients/${input.clientId}/websites/${input.websiteId}`;
    revalidatePath(base);
    revalidatePath(`${base}/backups`);
  }
  return result;
}

export async function actionQueueBackupNow(input: {
  websiteId: string;
  clientId: string;
  settings: BackupsSettings;
  /** Optional archive base name; defaults to website name. */
  fileName?: string;
  websiteName?: string;
}): Promise<
  | { ok: true; triggered: boolean; triggerNote?: string }
  | { ok: false; error: string }
> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const base = mergeBackupsSettings(input.settings);
  if (base.destination === "none") {
    return {
      ok: false,
      error: "Set a destination before running a backup.",
    };
  }

  const archiveName =
    sanitizeBackupFileName(input.fileName ?? "") ||
    defaultBackupFileName(input.websiteName ?? "website");

  const parts: string[] = [];
  if (base.includeDatabase) parts.push("database");
  if (base.includeFullSite) parts.push("full site files");
  else if (base.includeUploads) parts.push("uploads");
  const scope = parts.length ? parts.join(" + ") : "files";

  const latest = base.history[0];
  const entry =
    latest?.status === "pending"
      ? { ...latest, fileName: latest.fileName || archiveName }
      : {
          id: newBackupId(),
          label: new Date().toLocaleString(),
          detail: `${archiveName}.zip · ${scope} · ${destinationLabel(base.destination)}`,
          status: "pending" as const,
          destination: base.destination,
          sizeLabel: "",
          createdAt: new Date().toISOString(),
          progress: 0,
          fileName: archiveName,
        };

  const next =
    latest?.status === "pending"
      ? base
      : mergeBackupsSettings({
          ...base,
          history: [entry, ...base.history].slice(0, 100),
        });

  const saved = await actionSaveBackups({
    websiteId: input.websiteId,
    clientId: input.clientId,
    settings: next,
  });

  if (!saved.ok) {
    return saved;
  }

  const site = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ url: websites.url, status: websites.status })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    return row ?? null;
  });

  if (!site || site.status !== "connected") {
    return {
      ok: true,
      triggered: false,
      triggerNote:
        "Backup queued. Connect the WordPress connector to start it immediately.",
    };
  }

  const pushed = await pushBackupTriggerToSite({
    siteUrl: site.url,
    websiteId: input.websiteId,
    jobId: entry.id,
  });

  if (pushed.ok) {
    return { ok: true, triggered: true };
  }

  return {
    ok: true,
    triggered: false,
    triggerNote: pushed.error,
  };
}

/* ------------------------------------------------------------------ */
/*  Google Drive OAuth — one-click connect for agency users           */
/* ------------------------------------------------------------------ */

/**
 * Start Google Drive OAuth — returns the redirect URL.
 * Uses platform GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET (super admin env).
 */
export async function actionStartDriveOAuth(input: {
  websiteId: string;
  clientId: string;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return { ok: false, error: "No permission." };
  }

  const platform = getGoogleDriveOAuthConfig();
  if (!platform.enabled) {
    return {
      ok: false,
      error:
        "Google Drive backup is not enabled. Contact your platform administrator.",
    };
  }

  const state = signDriveOauthState({
    websiteId: input.websiteId,
    clientId: input.clientId,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", platform.clientId);
  url.searchParams.set("redirect_uri", driveOauthCallbackUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_DRIVE_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return { ok: true, url: url.toString() };
}

/**
 * Disconnect Google Drive — remove tokens, mark integration disconnected.
 */
export async function actionDisconnectDrive(input: {
  websiteId: string;
  clientId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return { ok: false, error: "No permission." };
  }

  await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return;

    const integrations = mergeIntegrationsSettings(row.settings?.integrations);
    const updatedConnections = integrations.connections.map((c) =>
      c.id === "google_drive"
        ? { ...c, connected: false, apiKey: "", webhookUrl: "", connectedAt: "" }
        : c,
    );

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      backupsDriveOAuth: mergeBackupsDriveOAuth({}),
      integrations: { connections: updatedConnections },
    };

    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));
  });

  const base = `/clients/${input.clientId}/websites/${input.websiteId}`;
  revalidatePath(base);
  revalidatePath(`${base}/backups`);
  return { ok: true };
}
