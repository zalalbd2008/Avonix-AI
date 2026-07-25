import { cookies } from "next/headers";

/**
 * Platform Owner “act as organization” preference.
 *
 * Unlike `avonix_org`, this cookie is only honored after `isPlatformOwner`
 * succeeds — it is never enough on its own to become a tenant.
 */
const COOKIE = "avonix_platform_org";
const ONE_DAY = 60 * 60 * 24;

export async function readPlatformOrgCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function writePlatformOrgCookie(agencyId: string) {
  const store = await cookies();
  store.set(COOKIE, agencyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearPlatformOrgCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}
