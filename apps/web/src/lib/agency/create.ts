"use server";

import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { agencies, memberships } from "@/lib/db/schema";

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "agency"
  );
}

/**
 * Create the caller's agency and make them its owner.
 *
 * THE BOOTSTRAP PROBLEM: the policy on `agencies` is `id = current_agency_id()`,
 * so an insert with no tenant set fails its WITH CHECK — you cannot create the
 * first agency, because you are not yet a member of one.
 *
 * The fix is not to weaken the policy or reach for the admin role. We mint the
 * uuid here and set it as the tenant *before* inserting, so the new row
 * satisfies the same check every other row does. The transaction can therefore
 * create exactly one agency: the one it declared up front.
 */
export async function createAgency(formData: FormData) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Give your agency a name." };

  const agencyId = crypto.randomUUID();
  const base = slugify(name);
  const slug = `${base}-${agencyId.slice(0, 6)}`;

  try {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT set_config('app.agency_id', ${agencyId}, true)`,
      );

      await tx.insert(agencies).values({
        id: agencyId,
        name,
        slug,
        plan: "free",
        status: "trialing",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      });

      await tx.insert(memberships).values({
        agencyId,
        userId: session.user.id,
        role: "owner",
        acceptedAt: new Date(),
      });
    });
  } catch (e) {
    console.error("createAgency failed", e);
    return { error: "Could not create the agency. Try again." };
  }

  return { agencyId };
}
