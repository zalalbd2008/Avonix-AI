/**
 * Google Drive OAuth for backup destination.
 * Platform OAuth app (env) — configured once by super admin.
 * Per-website we only store the user's tokens after "Connect with Google".
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { getGoogleOAuthConfig } from "@/lib/auth/social";

const STATE_TTL_MS = 15 * 60 * 1000;

function secret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.BACKUP_OAUTH_STATE_SECRET?.trim() ||
    "dev-backup-oauth-state"
  );
}

export type DriveOauthState = {
  websiteId: string;
  clientId: string;
  exp: number;
};

export function signDriveOauthState(
  payload: Omit<DriveOauthState, "exp">,
): string {
  const body: DriveOauthState = {
    ...payload,
    exp: Date.now() + STATE_TTL_MS,
  };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifyDriveOauthState(raw: string): DriveOauthState | null {
  const [json, sig] = raw.split(".");
  if (!json || !sig) return null;
  const expected = createHmac("sha256", secret())
    .update(json)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(json, "base64url").toString("utf8"),
    ) as DriveOauthState;
    if (!parsed.websiteId || !parsed.clientId) return null;
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function driveOauthCallbackUrl() {
  return `${appBaseUrl()}/api/backups/oauth/google/callback`;
}

/** Platform Google OAuth — same app as sign-in; super admin sets env once. */
export function getGoogleDriveOAuthConfig() {
  return getGoogleOAuthConfig();
}

export function isGoogleDriveBackupEnabled() {
  return getGoogleDriveOAuthConfig().enabled;
}

export const GOOGLE_DRIVE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

/** Per-website Drive tokens (no client secrets stored here). */
export type BackupsDriveOAuth = {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  email: string;
  connectedAt: string;
};

export function mergeBackupsDriveOAuth(
  raw?: Partial<BackupsDriveOAuth> | null,
): BackupsDriveOAuth {
  return {
    accessToken: raw?.accessToken ?? "",
    refreshToken: raw?.refreshToken ?? "",
    tokenExpiresAt: raw?.tokenExpiresAt ?? "",
    email: raw?.email ?? "",
    connectedAt: raw?.connectedAt ?? "",
  };
}

export function isDriveConnected(auth: BackupsDriveOAuth): boolean {
  return Boolean(auth.refreshToken && auth.connectedAt);
}

/** Refresh an expired access token using platform OAuth credentials. */
export async function refreshDriveAccessToken(
  auth: BackupsDriveOAuth,
): Promise<{ accessToken: string; expiresAt: string }> {
  const platform = getGoogleDriveOAuthConfig();
  if (!platform.enabled) {
    throw new Error("Google Drive backup is not configured on this platform.");
  }
  if (!auth.refreshToken) {
    throw new Error("No refresh token — reconnect Google Drive.");
  }

  const body = new URLSearchParams({
    client_id: platform.clientId,
    client_secret: platform.clientSecret,
    refresh_token: auth.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Drive token refresh failed",
    );
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(
      Date.now() + (data.expires_in ?? 3600) * 1000,
    ).toISOString(),
  };
}
