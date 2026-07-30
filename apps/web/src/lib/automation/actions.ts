"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAgency } from "@/lib/auth/session";
import { withAgency } from "@/lib/db";
import { websites, type WebsiteSettings } from "@/lib/db/schema";
import { isValidEmail } from "@/lib/website-email/types";
import {
  isSocialConnected,
  mergeAutomationSettings,
  needsSocialTargets,
  type AutomationSettings,
} from "./types";

function canEditWebsites(permissions: string[] | "*") {
  if (permissions === "*") return true;
  return permissions.includes("websites.edit");
}

export async function actionSaveAutomation(input: {
  websiteId: string;
  clientId: string;
  settings: AutomationSettings;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await requireAgency();
  if (!canEditWebsites(ctx.permissions)) {
    return {
      ok: false,
      error: "You do not have permission to edit websites.",
    };
  }

  const automation = mergeAutomationSettings(input.settings);

  if (
    automation.defaultNotifyEmail &&
    !isValidEmail(automation.defaultNotifyEmail)
  ) {
    return { ok: false, error: "Default notify email is not valid." };
  }

  for (const account of automation.socialAccounts) {
    if (account.connected) {
      if (!account.accountId.trim() || !account.accessToken.trim()) {
        return {
          ok: false,
          error: `Connect ${account.provider}: add account ID and access token, or disconnect.`,
        };
      }
    }
  }

  for (const rule of automation.rules) {
    if (!rule.name.trim()) {
      return { ok: false, error: "Every rule needs a short name." };
    }
    if (rule.actions.length === 0) {
      return {
        ok: false,
        error: `Rule “${rule.name}” needs at least one action.`,
      };
    }
    if (rule.notifyEmail && !isValidEmail(rule.notifyEmail)) {
      return {
        ok: false,
        error: `Notify email on “${rule.name}” is not valid.`,
      };
    }
    if (rule.actions.includes("webhook")) {
      const url = rule.webhookUrl || automation.defaultWebhookUrl;
      if (url && !/^https?:\/\//i.test(url)) {
        return {
          ok: false,
          error: `Webhook on “${rule.name}” must start with http:// or https://`,
        };
      }
    }
    if (rule.actions.includes("tag_contact") && !rule.tag.trim()) {
      return {
        ok: false,
        error: `Add a tag name on “${rule.name}” (or remove the Add tag action).`,
      };
    }

    if (needsSocialTargets(rule.actions)) {
      if (rule.actions.includes("notify_whatsapp")) {
        if (!isSocialConnected(automation, "whatsapp")) {
          return {
            ok: false,
            error: `Connect WhatsApp before using WhatsApp message on “${rule.name}”.`,
          };
        }
      }
      if (
        rule.actions.includes("post_social") ||
        rule.actions.includes("reply_social")
      ) {
        if (rule.socialTargets.length === 0) {
          return {
            ok: false,
            error: `Pick at least one social network on “${rule.name}”.`,
          };
        }
        for (const target of rule.socialTargets) {
          if (!isSocialConnected(automation, target)) {
            return {
              ok: false,
              error: `Connect ${target} before using it on “${rule.name}”.`,
            };
          }
        }
        if (!rule.socialMessage.trim()) {
          return {
            ok: false,
            error: `Add a short social message on “${rule.name}”.`,
          };
        }
      }
    }
    if (rule.actions.includes("assign_sales")) {
      if (!rule.assignee.trim() && rule.budgetThreshold <= 0 && rule.minScore <= 0) {
        // ok — will use default assignee label and AI hot signals
      }
      if (rule.salesNotifyEmail && !isValidEmail(rule.salesNotifyEmail)) {
        return {
          ok: false,
          error: `Sales notify email on “${rule.name}” is not valid.`,
        };
      }
    }
    if (rule.actions.includes("schedule_follow_up")) {
      if (rule.followUpDelayHours < 1) {
        return {
          ok: false,
          error: `Follow-up delay on “${rule.name}” must be at least 1 hour.`,
        };
      }
    }
  }

  if (
    automation.defaultWebhookUrl &&
    !/^https?:\/\//i.test(automation.defaultWebhookUrl)
  ) {
    return {
      ok: false,
      error: "Default webhook must start with http:// or https://",
    };
  }

  const result = await withAgency(ctx.agencyId, async (tx) => {
    const [row] = await tx
      .select({ id: websites.id, settings: websites.settings })
      .from(websites)
      .where(eq(websites.id, input.websiteId))
      .limit(1);
    if (!row) return { ok: false as const, error: "Website not found." };

    const next: WebsiteSettings = {
      ...(row.settings ?? {}),
      automation,
    };

    await tx
      .update(websites)
      .set({ settings: next, updatedAt: new Date() })
      .where(eq(websites.id, input.websiteId));

    return { ok: true as const };
  });

  if (result.ok) {
    const base = `/clients/${input.clientId}/websites/${input.websiteId}`;
    revalidatePath(base);
    revalidatePath(`${base}/automation`);
  }
  return result;
}
