"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import {
  GOOGLE_SMTP_SCOPES,
  MICROSOFT_SMTP_SCOPES,
  signSmtpOauthState,
  smtpOauthCallbackUrl,
} from "./oauth-state";
import {
  isValidEmail,
  mergeWebsiteEmailSettings,
  type WebsiteEmailSettings,
} from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveWebsiteEmail(input: {
  websiteId: string;
  clientId: string;
  settings: WebsiteEmailSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const email = mergeWebsiteEmailSettings(input.settings);

  if (email.enabled) {
    if (!email.host) {
      return { ok: false, error: "SMTP host is required when email is enabled." };
    }
    if (!email.fromEmail || !isValidEmail(email.fromEmail)) {
      return {
        ok: false,
        error: "Enter a valid From email address.",
      };
    }
    if (
      (email.authMode === "google" || email.authMode === "microsoft") &&
      (!email.oauthClientId || !email.oauthClientSecret)
    ) {
      return {
        ok: false,
        error:
          "OAuth Client ID and Client Secret are required for this auth mode.",
      };
    }
  }

  if (email.fromEmail && !isValidEmail(email.fromEmail)) {
    return { ok: false, error: "From email is not valid." };
  }
  if (email.replyTo && !isValidEmail(email.replyTo)) {
    return { ok: false, error: "Reply-To email is not valid." };
  }
  if (email.notifyEmail && !isValidEmail(email.notifyEmail)) {
    return { ok: false, error: "Notify email is not valid." };
  }
  if (email.campaignReplyTo && !isValidEmail(email.campaignReplyTo)) {
    return { ok: false, error: "Campaign reply-to email is not valid." };
  }

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const prev = mergeWebsiteEmailSettings(row.settings?.email);
    const nextEmail: WebsiteEmailSettings = {
      ...email,
      oauthRefreshToken:
        email.oauthRefreshToken ||
        (email.authMode === prev.authMode ? prev.oauthRefreshToken : ""),
      oauthAccessToken:
        email.oauthAccessToken ||
        (email.authMode === prev.authMode ? prev.oauthAccessToken : ""),
      oauthTokenExpiresAt:
        email.oauthTokenExpiresAt ||
        (email.authMode === prev.authMode ? prev.oauthTokenExpiresAt : ""),
      oauthVerifiedEmail:
        email.oauthVerifiedEmail ||
        (email.authMode === prev.authMode ? prev.oauthVerifiedEmail : ""),
      oauthVerifiedAt:
        email.oauthVerifiedAt ||
        (email.authMode === prev.authMode ? prev.oauthVerifiedAt : ""),
      oauthProvider:
        email.oauthProvider ||
        (email.authMode === prev.authMode ? prev.oauthProvider : ""),
    };

    if (!nextEmail.oauthClientSecret && prev.oauthClientSecret) {
      nextEmail.oauthClientSecret = prev.oauthClientSecret;
    }
    if (!nextEmail.password && prev.password) {
      nextEmail.password = prev.password;
    }

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      email: nextEmail,
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
    revalidatePath(`${base}/email`);
  }
  return result;
}

/**
 * Save OAuth client credentials, then return the provider authorize URL.
 */
export async function actionStartWebsiteEmailOauth(input: {
  websiteId: string;
  clientId: string;
  provider: "google" | "microsoft";
  settings: WebsiteEmailSettings;
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const email = mergeWebsiteEmailSettings({
    ...input.settings,
    authMode: input.provider,
  });

  if (!email.oauthClientId || !email.oauthClientSecret) {
    return {
      ok: false,
      error: "Enter OAuth Client ID and Client Secret first.",
    };
  }

  const saved = await actionSaveWebsiteEmail({
    websiteId: input.websiteId,
    clientId: input.clientId,
    settings: email,
  });
  if (!saved.ok) return saved;

  const state = signSmtpOauthState({
    websiteId: input.websiteId,
    clientId: input.clientId,
    provider: input.provider,
  });
  const redirectUri = smtpOauthCallbackUrl(input.provider);

  if (input.provider === "google") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", email.oauthClientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", GOOGLE_SMTP_SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    return { ok: true, url: url.toString() };
  }

  const tenant =
    process.env.MICROSOFT_TENANT_ID?.trim() ||
    process.env.SMTP_MICROSOFT_TENANT_ID?.trim() ||
    "common";
  const url = new URL(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
  );
  url.searchParams.set("client_id", email.oauthClientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", MICROSOFT_SMTP_SCOPES);
  url.searchParams.set("state", state);
  return { ok: true, url: url.toString() };
}
