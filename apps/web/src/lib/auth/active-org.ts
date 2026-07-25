import { cookies } from "next/headers";

/**
 * Which organization the user is currently acting as.
 *
 * The cookie is a *preference*, never an authorisation. Nothing reads it
 * without checking the user actually has a membership in that organization —
 * see `getActiveContext`. A cookie that names an org you were removed from, or
 * one you were never in, resolves to your first real membership instead of an
 * error, because the honest answer to "show me an org you cannot see" is to
 * show you one you can.
 *
 * httpOnly so page scripts cannot read or set it. That does not make it
 * trustworthy — a cookie is client-supplied whatever the flags say — it just
 * removes the easiest way to fiddle with it.
 */
const COOKIE = "avonix_org";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function readActiveOrgCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

export async function writeActiveOrgCookie(agencyId: string) {
  const store = await cookies();
  store.set(COOKIE, agencyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearActiveOrgCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}
