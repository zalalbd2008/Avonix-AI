import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { tenantColumns, timestamps } from "./_shared";
import { clients } from "./clients";
import { contacts } from "./contacts";

/** One pipeline per client in v1 (ADR-003). The table allows more later. */
export const pipelines = pgTable(
  "pipelines",
  {
    ...tenantColumns,
    clientId: uuid("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Sales"),
    ...timestamps,
  },
  (t) => [index("pipelines_client_idx").on(t.clientId)],
);

export const pipelineStages = pgTable(
  "pipeline_stages",
  {
    ...tenantColumns,
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (t) => [index("pipeline_stages_pipeline_idx").on(t.pipelineId, t.position)],
);

/** A contact's placement on a pipeline. Manual moves only in v1. */
export const pipelineCards = pgTable(
  "pipeline_cards",
  {
    ...tenantColumns,
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id").notNull().references(() => pipelineStages.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    valueCents: integer("value_cents"),
    ...timestamps,
  },
  (t) => [
    index("pipeline_cards_stage_idx").on(t.stageId, t.position),
    index("pipeline_cards_contact_idx").on(t.contactId),
  ],
);

export const pipelineStagesRelations = relations(pipelineStages, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [pipelineStages.pipelineId], references: [pipelines.id] }),
  cards: many(pipelineCards),
}));

export type Pipeline = typeof pipelines.$inferSelect;
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type PipelineCard = typeof pipelineCards.$inferSelect;
