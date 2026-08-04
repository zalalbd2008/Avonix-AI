import { processMissedChats, processUptimeChecks } from "@/lib/automation/cron-jobs";
import { processScheduledKnowledgeCrawls } from "@/lib/ai/scheduled-crawl";
import { processDueFollowUps } from "@/lib/automation/followups";
import { processScheduledBackups } from "@/lib/backups/cron";

/**
 * GET/POST /api/cron/automation
 *
 * Runs:
 * 1. Due follow-up emails (open → offer / else reminder)
 * 2. Missed chat detection (queued too long)
 * 3. Uptime probes → uptime_down rules
 * 4. Scheduled knowledge re-crawl (stale > 7 days)
 *
 * Protect with CRON_SECRET (required in production).
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/automation
 *
 * Vercel Cron: see vercel.json (every 5 minutes).
 * Hostinger/VPS: crontab every 5 min hitting this URL.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const query = new URL(request.url).searchParams.get("secret") ?? "";
  return bearer === secret || query === secret;
}

async function run(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  async function safe<T>(
    name: string,
    fn: () => Promise<T>,
  ): Promise<T | { error: string }> {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[cron/automation] ${name} failed`, err);
      return { error: message };
    }
  }

  const [followUps, missed, uptime, backups, knowledge] = await Promise.all([
    safe("followUps", () => processDueFollowUps(50)),
    safe("missedChat", () => processMissedChats(40)),
    safe("uptime", () => processUptimeChecks(30)),
    safe("backups", () => processScheduledBackups(20)),
    safe("knowledge", () => processScheduledKnowledgeCrawls(10)),
  ]);

  const failed = [followUps, missed, uptime, backups, knowledge].filter(
    (r) => r && typeof r === "object" && "error" in r,
  );

  return Response.json({
    ok: failed.length === 0,
    followUps,
    missedChat: missed,
    uptime,
    backups,
    knowledge,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
