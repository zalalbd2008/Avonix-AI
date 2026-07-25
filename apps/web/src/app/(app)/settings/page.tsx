import { eq } from "drizzle-orm";
import { requireAgency } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { normalizePlatformLocale } from "@/lib/i18n/platform-languages";
import { AccountSettingsDashboard } from "@/components/settings/account-settings";

/** Route: /settings — personal account dashboard for the signed-in agency user. */
export default async function AgencySettingsPage() {
  const ctx = await requireAgency();

  const [row] = await db
    .select({
      name: user.name,
      email: user.email,
      image: user.image,
      phone: user.phone,
      locale: user.locale,
    })
    .from(user)
    .where(eq(user.id, ctx.userId))
    .limit(1);

  const { firstName, lastName } = splitName(row?.name ?? ctx.userName);
  const locale = normalizePlatformLocale(row?.locale ?? ctx.locale);

  return (
    <AccountSettingsDashboard
      profile={{
        firstName,
        lastName,
        email: row?.email ?? ctx.userEmail,
        phone: row?.phone ?? "",
        locale,
        image: row?.image ?? null,
        agencyName: ctx.agencyName,
        role: ctx.role,
      }}
    />
  );
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}
