/**
 * Dropbox + OneDrive OAuth for backup destinations.
 * Platform apps (env) — configured once by super admin.
 * Per-website we only store the user's tokens after Connect.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { getMicrosoftOAuthConfig } from "@/lib/auth/social";
import { appBaseUrl } from "@/lib/backups/drive-oauth";

const STATE_TTL_MS = 15 * 60 * 1000;

function secret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.BACKUP_OAUTH_STATE_SECRET?.trim() ||
    "dev-backup-oauth-state"
  );
}

export type CloudOauthProvider = "dropbox" | "onedrive";

export type CloudOauthState = {
  websiteId: string;
  clientId: string;
  provider: CloudOauthProvider;
  exp: number;
};

export type BackupsCloudOAuth = {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  email: string;
  accountName: string;
  connectedAt: string;
};

export function signCloudOauthState(
  payload: Omit<CloudOauthState, "exp">,
): string {
  const body: CloudOauthState = {
    ...payload,
    exp: Date.now() + STATE_TTL_MS,
  };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifyCloudOauthState(raw: string): CloudOauthState | null {
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
    ) as CloudOauthState;
    if (!parsed.websiteId || !parsed.clientId) return null;
    if (parsed.provider !== "dropbox" && parsed.provider !== "onedrive") {
      return null;
    }
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function mergeBackupsCloudOAuth(
  raw?: Partial<BackupsCloudOAuth> | null,
): BackupsCloudOAuth {
  return {
    accessToken: raw?.accessToken ?? "",
    refreshToken: raw?.refreshToken ?? "",
    tokenExpiresAt: raw?.tokenExpiresAt ?? "",
    email: raw?.email ?? "",
    accountName: raw?.accountName ?? "",
    connectedAt: raw?.connectedAt ?? "",
  };
}

export function isCloudConnected(auth: BackupsCloudOAuth): boolean {
  return Boolean(
    (auth.refreshToken || auth.accessToken) && auth.connectedAt,
  );
}

export function cloudAccountLabel(auth: BackupsCloudOAuth): string {
  return auth.email || auth.accountName || "Connected";
}

/* ------------------------------------------------------------------ */
/*  Dropbox                                                            */
/* ------------------------------------------------------------------ */

export function getDropboxOAuthConfig() {
  const appKey =
    process.env.DROPBOX_APP_KEY?.trim() ||
    process.env.NEXT_PUBLIC_DROPBOX_APP_KEY?.trim() ||
    "";
  const appSecret = process.env.DROPBOX_APP_SECRET?.trim() || "";
  return {
    enabled: Boolean(appKey && appSecret),
    appKey,
    appSecret,
  };
}

export function isDropboxBackupEnabled() {
  return getDropboxOAuthConfig().enabled;
}

export function dropboxOauthCallbackUrl() {
  return `${appBaseUrl()}/api/backups/oauth/dropbox/callback`;
}

export const DROPBOX_SCOPES = [
  "account_info.read",
  "files.content.write",
  "files.content.read",
].join(" ");

export async function refreshDropboxAccessToken(
  auth: BackupsCloudOAuth,
): Promise<{ accessToken: string; expiresAt: string }> {
  const platform = getDropboxOAuthConfig();
  if (!platform.enabled) {
    throw new Error("Dropbox backup is not configured on this platform.");
  }
  if (!auth.refreshToken) {
    throw new Error("No Dropbox refresh token — reconnect Dropbox.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: auth.refreshToken,
    client_id: platform.appKey,
    client_secret: platform.appSecret,
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
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
      data.error_description || data.error || "Dropbox token refresh failed",
    );
  }
  return {
    accessToken: data.access_token,
    expiresAt: new Date(
      Date.now() + (data.expires_in ?? 14400) * 1000,
    ).toISOString(),
  };
}

export async function exchangeDropboxCode(code: string) {
  const platform = getDropboxOAuthConfig();
  if (!platform.enabled) throw new Error("Dropbox is not configured.");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: platform.appKey,
    client_secret: platform.appSecret,
    redirect_uri: dropboxOauthCallbackUrl(),
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Dropbox token exchange failed",
    );
  }

  const meRes = await fetch(
    "https://api.dropboxapi.com/2/users/get_current_account",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        "Content-Type": "application/json",
      },
      body: "null",
    },
  );
  const me = (await meRes.json()) as {
    email?: string;
    name?: { display_name?: string };
    error_summary?: string;
  };
  if (!meRes.ok) {
    throw new Error(me.error_summary || "Dropbox account lookup failed");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(
      Date.now() + (data.expires_in ?? 14400) * 1000,
    ).toISOString(),
    email: (me.email ?? "").toLowerCase(),
    accountName: me.name?.display_name ?? "",
  };
}

/* ------------------------------------------------------------------ */
/*  OneDrive (Microsoft Graph)                                         */
/* ------------------------------------------------------------------ */

export function getOneDriveOAuthConfig() {
  return getMicrosoftOAuthConfig();
}

export function isOneDriveBackupEnabled() {
  return getOneDriveOAuthConfig().enabled;
}

export function oneDriveOauthCallbackUrl() {
  return `${appBaseUrl()}/api/backups/oauth/onedrive/callback`;
}

export const ONEDRIVE_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Files.ReadWrite",
  "User.Read",
].join(" ");

export async function refreshOneDriveAccessToken(
  auth: BackupsCloudOAuth,
): Promise<{ accessToken: string; expiresAt: string }> {
  const platform = getOneDriveOAuthConfig();
  if (!platform.enabled) {
    throw new Error("OneDrive backup is not configured on this platform.");
  }
  if (!auth.refreshToken) {
    throw new Error("No OneDrive refresh token — reconnect OneDrive.");
  }

  const body = new URLSearchParams({
    client_id: platform.clientId,
    client_secret: platform.clientSecret,
    refresh_token: auth.refreshToken,
    grant_type: "refresh_token",
    scope: ONEDRIVE_SCOPES,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${platform.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "OneDrive token refresh failed",
    );
  }
  return {
    accessToken: data.access_token,
    expiresAt: new Date(
      Date.now() + (data.expires_in ?? 3600) * 1000,
    ).toISOString(),
  };
}

export async function exchangeOneDriveCode(code: string) {
  const platform = getOneDriveOAuthConfig();
  if (!platform.enabled) throw new Error("OneDrive is not configured.");

  const body = new URLSearchParams({
    client_id: platform.clientId,
    client_secret: platform.clientSecret,
    code,
    redirect_uri: oneDriveOauthCallbackUrl(),
    grant_type: "authorization_code",
    scope: ONEDRIVE_SCOPES,
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${platform.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "OneDrive token exchange failed",
    );
  }

  const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const me = (await meRes.json()) as {
    mail?: string;
    userPrincipalName?: string;
    displayName?: string;
    error?: { message?: string };
  };
  if (!meRes.ok) {
    throw new Error(me.error?.message || "Microsoft account lookup failed");
  }

  const email = (me.mail || me.userPrincipalName || "").toLowerCase();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(
      Date.now() + (data.expires_in ?? 3600) * 1000,
    ).toISOString(),
    email,
    accountName: me.displayName ?? "",
  };
}
