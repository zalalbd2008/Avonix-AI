import { and, eq, gte } from "drizzle-orm";
import { withAgency } from "@/lib/db";
import { formAnalyticsEvents } from "@/lib/db/schema";
import {
  emptyAnalyticsSummary,
  summarizeAnalyticsEvents,
  type FormAnalyticsSummary,
} from "@/lib/forms/analytics";

/** Aggregate funnel metrics for a form over the last `days` days. */
export async function getFormAnalyticsSummary(opts: {
  agencyId: string;
  formId: string;
  days?: number;
}): Promise<FormAnalyticsSummary> {
  const days = Math.min(Math.max(opts.days ?? 30, 1), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await withAgency(opts.agencyId, (tx) =>
    tx
      .select({
        eventType: formAnalyticsEvents.eventType,
        fieldKey: formAnalyticsEvents.fieldKey,
        durationMs: formAnalyticsEvents.durationMs,
        utm: formAnalyticsEvents.utm,
        createdAt: formAnalyticsEvents.createdAt,
      })
      .from(formAnalyticsEvents)
      .where(
        and(
          eq(formAnalyticsEvents.formId, opts.formId),
          gte(formAnalyticsEvents.createdAt, since),
        ),
      ),
  );

  if (!rows.length) return emptyAnalyticsSummary();
  return summarizeAnalyticsEvents(rows);
}
