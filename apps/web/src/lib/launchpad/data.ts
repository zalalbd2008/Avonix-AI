import { asc, isNull } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { clients, websites } from "@/lib/db/schema";
import {
  computeLaunchpadSnapshot,
  type LaunchpadClient,
  type LaunchpadSnapshot,
} from "./steps";

export type { LaunchpadSnapshot };

/** Load clients + websites for the Launchpad dashboard. */
export async function loadLaunchpadSnapshot(
  agencyId: string,
): Promise<LaunchpadSnapshot> {
  const rows = await withAgency(agencyId, async (tx) => {
    const clientRows = await tx
      .select({
        id: clients.id,
        name: clients.name,
      })
      .from(clients)
      .where(isNull(clients.deletedAt))
      .orderBy(asc(clients.name));

    const websiteRows = await tx
      .select({
        id: websites.id,
        clientId: websites.clientId,
        name: websites.name,
        url: websites.url,
        status: websites.status,
      })
      .from(websites)
      .where(isNull(websites.deletedAt))
      .orderBy(asc(websites.name));

    return { clientRows, websiteRows };
  });

  const byClient = new Map<string, LaunchpadClient>();
  for (const c of rows.clientRows) {
    byClient.set(c.id, { id: c.id, name: c.name, websites: [] });
  }
  for (const w of rows.websiteRows) {
    const client = byClient.get(w.clientId);
    if (!client) continue;
    client.websites.push({
      id: w.id,
      name: w.name,
      url: w.url,
      status: w.status,
    });
  }

  return computeLaunchpadSnapshot([...byClient.values()]);
}
