import { date, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";

/**
 * Per-agency AI metering. ADR-004 calls this mandatory, not optional: without it
 * the free tier becomes an unpayable bill.
 *
 * One row per agency per day per model. Incremented on every AI call.
 */
export const aiUsageDaily = pgTable(
  "ai_usage_daily",
  {
    ...primaryId,
    agencyId: agencyId(),
    day: date("day").notNull(),
    model: text("model").notNull(),

    requests: integer("requests").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cachedInputTokens: integer("cached_input_tokens").notNull().default(0),

    /** Denormalised so quota checks are one indexed read, not a sum. */
    estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("ai_usage_agency_day_model_key").on(t.agencyId, t.day, t.model),
    index("ai_usage_agency_day_idx").on(t.agencyId, t.day),
  ],
);

export type AiUsageDaily = typeof aiUsageDaily.$inferSelect;
