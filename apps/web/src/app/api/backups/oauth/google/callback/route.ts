import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { mergeBackupsSettings } from "@/lib/backups/types";
import {
  driveOauthCallbackUrl,
  getGoogleDriveOAuthConfig,
  mergeBackupsDriveOAuth,
  verifyDriveOauthState,
} from "@/lib/backups/drive-oauth";
import { mergeIntegrationsSettings } from "@/lib/integrations/types";

async function exchangeGoogle(
  code: string,
  clientId: string,
  clientSecret: string,
) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: driveOauthCallbackUrl(),
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
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
      data.error_description || data.error || "Google token exchange failed",
    );
  }

  const meRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${data.access_token}` } },
  );
  const me = (await meRes.json()) as { email?: string };
  if (!me.email) throw new Error("Google did not return an email address.");

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(
      Date.now() + (data.expires_in ?? 3600) * 1000,
    ).toISOString(),
    email: me.email.toLowerCase(),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const err = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") ?? "";

  const state = verifyDriveOauthState(stateRaw);
  if (!state) {
    return NextResponse.redirect(
      new URL("/websites?oauth=invalid_state", url.origin),
    );
  }

  const returnPath = `/clients/${state.clientId}/websites/${state.websiteId}/backups`;

  if (err) {
    return NextResponse.redirect(
      new URL(
        `${returnPath}?oauth=denied&reason=${encodeURIComponent(err)}`,
        url.origin,
      ),
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL(`${returnPath}?oauth=missing_code`, url.origin),
    );
  }

  try {
    await requireAgency();
  } catch {
    return NextResponse.redirect(
      new URL(
        `/sign-in?callbackURL=${encodeURIComponent(returnPath)}`,
        url.origin,
      ),
    );
  }

  const session = await requireAgency();
  const platform = getGoogleDriveOAuthConfig();
  if (!platform.enabled) {
    return NextResponse.redirect(
      new URL(
        `${returnPath}?oauth=error&reason=${encodeURIComponent("Google Drive is not configured on this platform.")}`,
        url.origin,
      ),
    );
  }

  try {
    await withAgency(session.agencyId, async (tx) => {
      const [row] = await tx
        .select({ settings: websites.settings })
        .from(websites)
        .where(eq(websites.id, state.websiteId))
        .limit(1);
      if (!row) throw new Error("Website not found.");

      const existing = mergeBackupsDriveOAuth(row.settings?.backupsDriveOAuth);

      const tokens = await exchangeGoogle(
        code,
        platform.clientId,
        platform.clientSecret,
      );

      if (!tokens.refreshToken && !existing.refreshToken) {
        throw new Error(
          "No refresh token returned. Revoke app access in your Google account and try again.",
        );
      }

      const driveAuth = mergeBackupsDriveOAuth({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || existing.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        email: tokens.email,
        connectedAt: new Date().toISOString(),
      });

      const integrations = mergeIntegrationsSettings(
        row.settings?.integrations,
      );
      const updatedConnections = integrations.connections.map((c) =>
        c.id === "google_drive"
          ? {
              ...c,
              connected: true,
              label: `Drive (${tokens.email})`,
              connectedAt: new Date().toISOString(),
            }
          : c,
      );

      const backups = mergeBackupsSettings(row.settings?.backups);
      if (backups.destination === "none") {
        backups.destination = "google_drive";
      }

      const next: WebsiteSettings = {
        ...(row.settings ?? {}),
        backupsDriveOAuth: driveAuth,
        backups,
        integrations: { connections: updatedConnections },
      };

      await tx
        .update(websites)
        .set({ settings: next, updatedAt: new Date() })
        .where(eq(websites.id, state.websiteId));
    });

    return NextResponse.redirect(
      new URL(`${returnPath}?oauth=ok`, url.origin),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(
        `${returnPath}?oauth=error&reason=${encodeURIComponent(message)}`,
        url.origin,
      ),
    );
  }
}
