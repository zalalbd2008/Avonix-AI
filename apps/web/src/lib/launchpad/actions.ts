"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites } from "@/lib/db/schema";

/** Check whether a website has connected after plugin install. */
export async function checkWebsiteConnection(websiteId: string): Promise<{
  ok: true;
  status: "pending" | "connected" | "disconnected";
  name: string;
} | { ok: false; error: string }> {
  const ctx = await requireAgency();

  const [row] = await withAgency(ctx.agencyId, (tx) =>
    tx
      .select({
        status: websites.status,
        name: websites.name,
      })
      .from(websites)
      .where(
        and(eq(websites.id, websiteId), isNull(websites.deletedAt)),
      )
      .limit(1),
  );

  if (!row) return { ok: false, error: "Website not found." };

  revalidatePath("/launchpad");
  revalidatePath("/dashboard");
  return { ok: true, status: row.status, name: row.name };
}
