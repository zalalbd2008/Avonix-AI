import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 5 * 60 * 1000;

function secret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.BACKUP_TRIGGER_SECRET?.trim() ||
    "dev-backup-trigger"
  );
}

export type BackupTriggerToken = {
  websiteId: string;
  jobId: string;
  exp: number;
};

export function signBackupTriggerToken(
  payload: Omit<BackupTriggerToken, "exp">,
): string {
  const body: BackupTriggerToken = {
    ...payload,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifyBackupTriggerToken(
  raw: string,
): BackupTriggerToken | null {
  const [json, sig] = raw.split(".");
  if (!json || !sig) return null;
  const expected = createHmac("sha256", secret())
    .update(json)
    .digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(
      Buffer.from(json, "base64url").toString("utf8"),
    ) as BackupTriggerToken;
    if (
      typeof payload.websiteId !== "string" ||
      typeof payload.jobId !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
