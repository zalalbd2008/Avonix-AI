/**
 * Server-side enterprise helpers (portal HMAC).
 * Pure config / scoring / import-export live in `enterprise-config.ts`.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export {
  DEFAULT_ENTERPRISE,
  DEFAULT_ROI,
  appendAuditEntry,
  buildExportBundle,
  computeUniqueScores,
  normalizeEnterprise,
  parseImportBundle,
  parseVersionPayload,
  publicEnterpriseForEmbed,
  pushVersionSnapshot,
  resolveRoiConfig,
  type FormExportBundle,
  type ScoreInput,
} from "./enterprise-config";

function portalSecret(): string {
  return (
    process.env.FORM_PORTAL_SECRET ||
    process.env.FORM_OTP_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "avonix-dev-portal"
  );
}

/** Mint a public portal token for a submission. */
export function mintPortalToken(opts: {
  agencyId: string;
  submissionId: string;
}): string {
  const body = `${opts.agencyId}.${opts.submissionId}.${Date.now().toString(36)}`;
  const sig = createHmac("sha256", portalSecret()).update(body).digest("base64url").slice(0, 22);
  return Buffer.from(`${body}.${sig}`).toString("base64url");
}

export function verifyPortalToken(
  token: string,
): { agencyId: string; submissionId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length < 4) return null;
    const [agencyId, submissionId, ts, sig] = parts;
    if (!agencyId || !submissionId || !ts || !sig) return null;
    const body = `${agencyId}.${submissionId}.${ts}`;
    const expect = createHmac("sha256", portalSecret()).update(body).digest("base64url").slice(0, 22);
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    // Tokens older than 180 days expire.
    const minted = parseInt(ts, 36);
    if (!Number.isFinite(minted) || Date.now() - minted > 180 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return { agencyId, submissionId };
  } catch {
    return null;
  }
}
