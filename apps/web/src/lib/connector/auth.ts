import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { connectorKeys } from "@/lib/db/schema";
import { hashConnectorKey, hashesMatch, looksLikeConnectorKey, readConnectorKey } from "./keys";

export type ConnectorIdentity = {
  websiteId: string;
  clientId: string;
  agencyId: string;
};

/**
 * Identify which website is calling.
 *
 * Read unscoped on purpose — this runs *before* a tenant is known, and its whole
 * job is to establish one. It is the connector-side mirror of `memberships` in
 * lib/auth/session.ts, and the same rule applies: the lookup is by key and by
 * nothing else, and everything afterwards goes through `withAgency`.
 *
 * The query hits `connector_keys` rather than `websites` precisely because
 * `websites` is tenant-scoped: with no tenant set, RLS returns zero rows and
 * every valid key would be rejected as invalid.
 */
export async function authenticateConnector(
  request: Request,
): Promise<ConnectorIdentity | null> {
  const key = readConnectorKey(request);
  if (!key || !looksLikeConnectorKey(key)) return null;

  const hash = hashConnectorKey(key);

  const [row] = await db
    .select({
      websiteId: connectorKeys.websiteId,
      clientId: connectorKeys.clientId,
      agencyId: connectorKeys.agencyId,
      hash: connectorKeys.secretHash,
    })
    .from(connectorKeys)
    .where(
      and(eq(connectorKeys.secretHash, hash), isNull(connectorKeys.revokedAt)),
    )
    .limit(1);

  if (!row) return null;
  if (!hashesMatch(row.hash, hash)) return null;

  return {
    websiteId: row.websiteId,
    clientId: row.clientId,
    agencyId: row.agencyId,
  };
}

/**
 * One JSON shape for every connector failure.
 *
 * A bad key, a deleted site and a site that never existed all produce the same
 * 401. Distinguishing them would let anyone with a wordlist discover which keys
 * are real.
 */
export function connectorError(
  code: "unauthorized" | "rate_limited" | "bad_request" | "too_large",
  status: number,
  message: string,
  extra?: Record<string, unknown>,
) {
  return Response.json({ error: code, message, ...extra }, { status });
}
