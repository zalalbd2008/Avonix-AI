import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { withAgency } from "@/lib/db";
import { clients, websites } from "@/lib/db/schema";

/**
 * The client and website tree behind the sidebar switcher and the breadcrumbs.
 *
 * Both need to turn an id in the URL into a name, and neither runs on the
 * server where the id is known — the shell is one layout above the route that
 * has the params. Sending the tree down once is cheaper than a lookup per
 * render, and it is what makes the switcher's dropdown instant.
 *
 * Capped, and the cap is reported rather than hidden: an agency past the limit
 * gets told to use ⌘K instead of silently missing rows from a menu that looks
 * complete. `cache` so two components asking in one request query once.
 */
const LIMIT = 200;

export type SwitchableWebsite = {
  id: string;
  name: string;
  status: string;
  /** Drives the top bar's "last sync" line, as the prototype shows it. */
  lastSeenAt: Date | null;
};

export type SwitchableClient = {
  id: string;
  name: string;
  websites: SwitchableWebsite[];
};

export const switcherClients = cache(
  async (agencyId: string): Promise<{ clients: SwitchableClient[]; truncated: boolean }> => {
    const [clientRows, siteRows] = await withAgency(agencyId, async (tx) => [
      await tx
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .orderBy(asc(clients.name))
        .limit(LIMIT + 1),
      await tx
        .select({
          id: websites.id,
          clientId: websites.clientId,
          name: websites.name,
          status: websites.status,
          lastSeenAt: websites.lastSeenAt,
        })
        .from(websites)
        .orderBy(asc(websites.name)),
    ]);

    const byClient = new Map<string, SwitchableWebsite[]>();
    for (const s of siteRows) {
      const list = byClient.get(s.clientId) ?? [];
      list.push({ id: s.id, name: s.name, status: s.status, lastSeenAt: s.lastSeenAt });
      byClient.set(s.clientId, list);
    }

    return {
      clients: clientRows.slice(0, LIMIT).map((c) => ({
        id: c.id,
        name: c.name,
        websites: byClient.get(c.id) ?? [],
      })),
      truncated: clientRows.length > LIMIT,
    };
  },
);
