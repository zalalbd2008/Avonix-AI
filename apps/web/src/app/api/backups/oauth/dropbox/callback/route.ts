import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { mergeBackupsSettings } from "@/lib/backups/types";
import { appBaseUrl } from "@/lib/backups/drive-oauth";
import {
  exchangeDropboxCode,
  getDropboxOAuthConfig,
  mergeBackupsCloudOAuth,
  verifyCloudOauthState,
} from "@/lib/backups/cloud-oauth";
import { mergeIntegrationsSettings } from "@/lib/integrations/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = appBaseUrl();
  const err = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") ?? "";

  const state = verifyCloudOauthState(stateRaw);
  if (!state || state.provider !== "dropbox") {
    return NextResponse.redirect(
      new URL("/websites?oauth=invalid_state", base),
    );
  }

  const returnPath = `/clients/${state.clientId}/websites/${state.websiteId}/backups`;

  if (err) {
    return NextResponse.redirect(
      new URL(
        `${returnPath}?oauth=denied&reason=${encodeURIComponent(err)}`,
        base,
      ),
    );
  }
  if (!code) {
    return NextResponse.redirect(
      new URL(`${returnPath}?oauth=missing_code`, base),
    );
  }

  try {
    await requireAgency();
  } catch {
    return NextResponse.redirect(
      new URL(
        `/sign-in?callbackURL=${encodeURIComponent(returnPath)}`,
        base,
      ),
    );
  }

  const session = await requireAgency();
  if (!getDropboxOAuthConfig().enabled) {
    return NextResponse.redirect(
      new URL(
        `${returnPath}?oauth=error&reason=${encodeURIComponent("Dropbox is not configured on this platform.")}`,
        base,
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

      const existing = mergeBackupsCloudOAuth(row.settings?.backupsDropboxOAuth);
      const tokens = await exchangeDropboxCode(code);

      if (!tokens.refreshToken && !existing.refreshToken) {
        throw new Error(
          "No refresh token from Dropbox. Check app permissions and try again.",
        );
      }

      const auth = mergeBackupsCloudOAuth({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || existing.refreshToken,
        tokenExpiresAt: tokens.expiresAt,
        email: tokens.email,
        accountName: tokens.accountName,
        connectedAt: new Date().toISOString(),
      });

      const integrations = mergeIntegrationsSettings(row.settings?.integrations);
      const updatedConnections = integrations.connections.map((c) =>
        c.id === "dropbox"
          ? {
              ...c,
              connected: true,
              label: `Dropbox (${tokens.email || tokens.accountName || "connected"})`,
              apiKey: "",
              connectedAt: new Date().toISOString(),
            }
          : c,
      );

      const backups = mergeBackupsSettings(row.settings?.backups);
      if (backups.destination === "none") {
        backups.destination = "dropbox";
      }

      const next: WebsiteSettings = {
        ...(row.settings ?? {}),
        backupsDropboxOAuth: auth,
        backups,
        integrations: { connections: updatedConnections },
      };

      await tx
        .update(websites)
        .set({ settings: next, updatedAt: new Date() })
        .where(eq(websites.id, state.websiteId));
    });

    return NextResponse.redirect(new URL(`${returnPath}?oauth=ok`, base));
  } catch (e) {
    const message = e instanceof Error ? e.message : "OAuth failed";
    return NextResponse.redirect(
      new URL(
        `${returnPath}?oauth=error&reason=${encodeURIComponent(message)}`,
        base,
      ),
    );
  }
}
