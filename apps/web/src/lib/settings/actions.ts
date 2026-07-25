"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { normalizePlatformLocale } from "@/lib/i18n/platform-languages";

export type ProfileInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  locale: string;
  image?: string | null;
};

function clean(s: string) {
  return s.trim();
}

/** Persist agency/account data from Settings. Email is display-only here. */
export async function updateAccountProfile(input: ProfileInput) {
  const me = await requireUser();

  const firstName = clean(input.firstName);
  const lastName = clean(input.lastName);
  if (!firstName || !lastName) {
    return { ok: false as const, error: "First and last name are required." };
  }

  const name = `${firstName} ${lastName}`.trim();
  const phone = clean(input.phone) || null;
  const locale = normalizePlatformLocale(input.locale);

  if (input.image && input.image.length > 3_500_000) {
    return { ok: false as const, error: "Brand logo must be 2.5 MB or smaller." };
  }

  await db
    .update(user)
    .set({
      name,
      phone,
      locale,
      ...(input.image !== undefined ? { image: input.image } : {}),
      updatedAt: new Date(),
    })
    .where(eq(user.id, me.userId));

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true as const, name, locale };
}
