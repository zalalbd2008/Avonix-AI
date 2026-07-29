/**
 * Cron workers: missed chat + uptime probes → Auto Rules triggers.
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import { adminDb } from "@/lib/db/admin";
import {
  contacts,
  conversations,
  websites,
  type WebsiteSettings,
} from "@/lib/db/schema";
import {
  mergeUptimeSettings,
  type UptimeSettings,
} from "@/lib/uptime/types";
import { enqueueWebsiteAutomation } from "./engine";
import { mergeAutomationSettings } from "./types";

export async function processMissedChats(limit = 40): Promise<{
  scanned: number;
  fired: number;
}> {
  const rows = await adminDb
    .select({
      id: conversations.id,
      agencyId: conversations.agencyId,
      clientId: conversations.clientId,
      websiteId: conversations.websiteId,
      contactId: conversations.contactId,
      lastMessageAt: conversations.lastMessageAt,
      settings: websites.settings,
      websiteName: websites.name,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
    })
    .from(conversations)
    .innerJoin(websites, eq(websites.id, conversations.websiteId))
    .leftJoin(contacts, eq(contacts.id, conversations.contactId))
    .where(
      and(
        eq(conversations.handoffStatus, "queued"),
        eq(conversations.status, "open"),
        eq(conversations.channel, "chat"),
        isNull(conversations.firstHumanReplyAt),
        isNull(conversations.missedChatAlertedAt),
        sql`${conversations.lastMessageAt} IS NOT NULL`,
      ),
    )
    .limit(limit * 3);

  let fired = 0;
  let scanned = 0;
  const now = Date.now();

  for (const row of rows) {
    if (!row.websiteId || !row.lastMessageAt) continue;
    scanned += 1;

    const automation = mergeAutomationSettings(row.settings?.automation);
    if (!automation.enabled) continue;
    const minutes = automation.missedChatMinutes || 15;
    const dueAt = row.lastMessageAt.getTime() + minutes * 60 * 1000;
    if (now < dueAt) continue;

    const hasRule = automation.rules.some(
      (r) => r.enabled && r.trigger === "chat_missed",
    );
    if (!hasRule) {
      // Still mark so we don't re-scan forever without rules
      await adminDb
        .update(conversations)
        .set({ missedChatAlertedAt: new Date(), updatedAt: new Date() })
        .where(eq(conversations.id, row.id));
      continue;
    }

    await adminDb
      .update(conversations)
      .set({ missedChatAlertedAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, row.id));

    enqueueWebsiteAutomation({
      trigger: "chat_missed",
      agencyId: row.agencyId,
      clientId: row.clientId,
      websiteId: row.websiteId,
      contactId: row.contactId,
      conversationId: row.id,
      websiteName: row.websiteName,
      contact: {
        name: row.contactName,
        email: row.contactEmail,
        phone: row.contactPhone,
        message: `Missed chat — queued over ${minutes} minutes`,
      },
      values: {},
    });
    fired += 1;
    if (fired >= limit) break;
  }

  return { scanned, fired };
}

export async function processUptimeChecks(limit = 30): Promise<{
  checked: number;
  down: number;
}> {
  const sites = await adminDb
    .select({
      id: websites.id,
      agencyId: websites.agencyId,
      clientId: websites.clientId,
      name: websites.name,
      url: websites.url,
      settings: websites.settings,
    })
    .from(websites)
    .where(isNull(websites.deletedAt))
    .limit(200);

  let checked = 0;
  let down = 0;
  const now = Date.now();

  for (const site of sites) {
    const uptime = mergeUptimeSettings(site.settings?.uptime);
    if (!uptime.enabled) continue;

    const last = uptime.lastCheckedAt
      ? Date.parse(uptime.lastCheckedAt)
      : 0;
    const intervalMs = uptime.intervalMinutes * 60 * 1000;
    if (last && now - last < intervalMs) continue;

    checked += 1;
    const result = await probeWebsite(site.url, uptime);
    const prev = uptime.lastStatus ?? "unknown";
    const nextStatus = result.up ? "up" : "down";

    const nextUptime: UptimeSettings = {
      ...uptime,
      lastStatus: nextStatus,
      lastCheckedAt: new Date().toISOString(),
      lastHttpStatus: result.status ?? undefined,
      lastError: result.error,
    };

    const nextSettings: WebsiteSettings = {
      ...(site.settings ?? {}),
      uptime: nextUptime,
    };

    await adminDb
      .update(websites)
      .set({ settings: nextSettings, updatedAt: new Date() })
      .where(eq(websites.id, site.id));

    const automation = mergeAutomationSettings(site.settings?.automation);
    const becameDown = nextStatus === "down" && prev !== "down";

    if (
      becameDown &&
      uptime.alertOnDown &&
      automation.enabled &&
      automation.rules.some((r) => r.enabled && r.trigger === "uptime_down")
    ) {
      down += 1;
      enqueueWebsiteAutomation({
        trigger: "uptime_down",
        agencyId: site.agencyId,
        clientId: site.clientId,
        websiteId: site.id,
        websiteName: site.name,
        pageUrl: site.url,
        contact: {
          message: `Site down: HTTP ${result.status ?? "n/a"} ${result.error ?? ""}`.trim(),
        },
        values: {
          url: site.url,
          httpStatus: result.status,
          error: result.error,
        },
      });
    }

    if (checked >= limit) break;
  }

  return { checked, down };
}

async function probeWebsite(
  url: string,
  uptime: UptimeSettings,
): Promise<{ up: boolean; status: number | null; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.max(3, uptime.timeoutSeconds) * 1000,
  );
  try {
    const target = url.startsWith("http") ? url : `https://${url}`;
    const res = await fetch(target, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "AvonixUptime/1.0" },
    });
    const status = res.status;
    let up = uptime.expectedStatusCodes.includes(status);
    if (up && uptime.keyword) {
      const body = await res.text();
      if (!body.toLowerCase().includes(uptime.keyword.toLowerCase())) {
        up = false;
        return { up, status, error: `Keyword missing: ${uptime.keyword}` };
      }
    }
    return { up, status, error: up ? undefined : `Unexpected status ${status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Probe failed";
    return { up: false, status: null, error: message.slice(0, 200) };
  } finally {
    clearTimeout(timer);
  }
}
