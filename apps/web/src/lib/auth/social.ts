/**
 * Social login providers — fill env vars and restart; buttons appear automatically.
 *
 * Google Cloud Console → OAuth client (Web):
 *   Redirect: {APP_URL}/api/auth/callback/google
 *
 * Microsoft Entra (Azure) → App registration:
 *   Redirect: {APP_URL}/api/auth/callback/microsoft
 *   (tenant: common | organizations | consumers | your-tenant-id)
 */

function env(...keys: string[]) {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export type SocialProviderId = "google" | "microsoft";

export function getGoogleOAuthConfig() {
  const clientId = env("GOOGLE_CLIENT_ID", "NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  const clientSecret = env("GOOGLE_CLIENT_SECRET");
  return {
    enabled: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
  };
}

export function getMicrosoftOAuthConfig() {
  const clientId = env(
    "MICROSOFT_CLIENT_ID",
    "NEXT_PUBLIC_MICROSOFT_CLIENT_ID",
  );
  const clientSecret = env("MICROSOFT_CLIENT_SECRET");
  const tenantId = env("MICROSOFT_TENANT_ID") || "common";
  return {
    enabled: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    tenantId,
  };
}

/** Which providers the UI should show (public client ids only). */
export function getPublicSocialFlags() {
  return {
    google: Boolean(env("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID")),
    microsoft: Boolean(
      env("NEXT_PUBLIC_MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_ID"),
    ),
  };
}
