import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import {
  appBaseUrl,
  smtpOauthCallbackUrl,
  verifySmtpOauthState,
} from "@/lib/website-email/oauth-state";
import { mergeWebsiteEmailSettings } from "@/lib/website-email/types";

type Provider = "google" | "microsoft";

async function exchangeGoogle(code: string, clientId: string, clientSecret: string) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: smtpOauthCallbackUrl("google"),
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

  const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
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

async function exchangeMicrosoft(
  code: string,
  clientId: string,
  clientSecret: string,
) {
  const tenant =
    process.env.MICROSOFT_TENANT_ID?.trim() ||
    process.env.SMTP_MICROSOFT_TENANT_ID?.trim() ||
    "common";
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: smtpOauthCallbackUrl("microsoft"),
    grant_type: "authorization_code",
    scope:
      "openid email profile offline_access https://outlook.office.com/SMTP.Send",
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
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
    id_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Microsoft token exchange failed",
    );
  }

  let email = "";
  if (data.id_token) {
    try {
      const payload = JSON.parse(
        Buffer.from(data.id_token.split(".")[1] ?? "", "base64url").toString(
          "utf8",
        ),
      ) as { email?: string; preferred_username?: string; upn?: string };
      email = (
        payload.email ||
        payload.preferred_username ||
        payload.upn ||
        ""
      ).toLowerCase();
    } catch {
      /* ignore */
    }
  }
  if (!email) {
    throw new Error("Microsoft did not return an email address.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(
      Date.now() + (data.expires_in ?? 3600) * 1000,
    ).toISOString(),
    email,
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { provider: raw } = await ctx.params;
  const provider = raw as Provider;
  if (provider !== "google" && provider !== "microsoft") {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const url = new URL(req.url);
  const base = appBaseUrl();
  const err = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") ?? "";

  const state = verifySmtpOauthState(stateRaw);
  if (!state || state.provider !== provider) {
    return NextResponse.redirect(
      new URL("/websites?oauth=invalid_state", base),
    );
  }

  const returnPath = `/clients/${state.clientId}/websites/${state.websiteId}/email`;

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

  try {
    const tokens = await withAgency(session.agencyId, async (tx) => {
      const [row] = await tx
        .select({ settings: websites.settings })
        .from(websites)
        .where(eq(websites.id, state.websiteId))
        .limit(1);
      if (!row) throw new Error("Website not found.");
      const email = mergeWebsiteEmailSettings(row.settings?.email);
      if (!email.oauthClientId || !email.oauthClientSecret) {
        throw new Error("OAuth Client ID / Secret missing — save them first.");
      }

      const exchanged =
        provider === "google"
          ? await exchangeGoogle(
              code,
              email.oauthClientId,
              email.oauthClientSecret,
            )
          : await exchangeMicrosoft(
              code,
              email.oauthClientId,
              email.oauthClientSecret,
            );

      if (!exchanged.refreshToken && !email.oauthRefreshToken) {
        throw new Error(
          "No refresh token returned. Revoke prior app access and try Verify again with consent.",
        );
      }

      const nextEmail = mergeWebsiteEmailSettings({
        ...email,
        authMode: provider,
        oauthProvider: provider,
        oauthAccessToken: exchanged.accessToken,
        oauthRefreshToken: exchanged.refreshToken || email.oauthRefreshToken,
        oauthTokenExpiresAt: exchanged.expiresAt,
        oauthVerifiedEmail: exchanged.email,
        oauthVerifiedAt: new Date().toISOString(),
        username: exchanged.email,
        fromEmail: email.fromEmail || exchanged.email,
        enabled: true,
        host:
          email.host ||
          (provider === "google" ? "smtp.gmail.com" : "smtp.office365.com"),
        port: email.port || 587,
        encryption: email.encryption || "tls",
      });

      const next: WebsiteSettings = {
        ...(row.settings ?? {}),
        email: nextEmail,
      };
      await tx
        .update(websites)
        .set({ settings: next, updatedAt: new Date() })
        .where(eq(websites.id, state.websiteId));

      return nextEmail;
    });

    return NextResponse.redirect(
      new URL(
        `${returnPath}?oauth=ok&email=${encodeURIComponent(tokens.oauthVerifiedEmail)}`,
        base,
      ),
    );
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
