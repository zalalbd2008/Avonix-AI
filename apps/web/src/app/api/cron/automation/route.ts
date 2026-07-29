import { processMissedChats, processUptimeChecks } from "@/lib/automation/cron-jobs";
import { processDueFollowUps } from "@/lib/automation/followups";
import { processScheduledBackups } from "@/lib/backups/cron";

/**
 * GET/POST /api/cron/automation
 *
 * Runs:
 * 1. Due follow-up emails (open → offer / else reminder)
 * 2. Missed chat detection (queued too long)
 * 3. Uptime probes → uptime_down rules
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

  const [followUps, missed, uptime, backups] = await Promise.all([
    processDueFollowUps(50),
    processMissedChats(40),
    processUptimeChecks(30),
    processScheduledBackups(20),
  ]);

  return Response.json({
    ok: true,
    followUps,
    missedChat: missed,
    uptime,
    backups,
  });
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
