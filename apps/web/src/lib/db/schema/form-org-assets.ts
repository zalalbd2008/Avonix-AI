/**
 * Organization reusable library pieces (ADR-007 Step 5).
 *
 * - Components — reusable field groups (not full forms)
 * - Sections — reusable section + child fields
 * - Assets — media / file metadata registered in the org cloud
 *
 * Tenant = agency_id. No cross-org reads (ADR-006).
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, softDelete, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { clients } from "./clients";
import { websites } from "./websites";
import { type FormField } from "./forms";
import { user } from "./auth";

export type FormLibraryScope =
  | "website"
  | "organization"
  | "personal"
  | "team"
  | "global";

export type FormLibraryStatus = "draft" | "published" | "archived";

export type FormLibraryVisibility = "private" | "organization" | "team";

export type FormAssetKind =
  | "image"
  | "document"
  | "video"
  | "font"
  | "icon"
  | "other";

/** Shared metadata columns for components & sections. */
const libraryMeta = {
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  thumbnailUrl: text("thumbnail_url"),
  scope: text("scope")
    .$type<FormLibraryScope>()
    .notNull()
    .default("organization"),
  status: text("status")
    .$type<FormLibraryStatus>()
    .notNull()
    .default("published"),
  visibility: text("visibility")
    .$type<FormLibraryVisibility>()
    .notNull()
    .default("organization"),
  clientId: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  websiteId: uuid("website_id").references(() => websites.id, {
    onDelete: "set null",
  }),
  usageCount: integer("usage_count").notNull().default(0),
  isLocked: boolean("is_locked").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  updatedBy: text("updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
};

/**
 * Reusable field group — e.g. “Contact block”, “Budget questions”.
 * Payload is FormField[] only (no form settings / submit copy).
 */
export const formComponents = pgTable(
  "form_components",
  {
    ...primaryId,
    agencyId: agencyId(),
    ...libraryMeta,
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("form_components_agency_idx").on(t.agencyId),
    index("form_components_scope_idx").on(t.agencyId, t.scope, t.status),
    index("form_components_created_by_idx").on(t.createdBy),
  ],
);

/**
 * Reusable section — typically a `type=section` heading plus body fields.
 * Stored as FormField[] so the builder can splice them in unchanged.
 */
export const formSections = pgTable(
  "form_sections",
  {
    ...primaryId,
    agencyId: agencyId(),
    ...libraryMeta,
    fields: jsonb("fields").$type<FormField[]>().notNull().default([]),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("form_sections_agency_idx").on(t.agencyId),
    index("form_sections_scope_idx").on(t.agencyId, t.scope, t.status),
    index("form_sections_created_by_idx").on(t.createdBy),
  ],
);

/**
 * Org media / file registry (URLs). Binary upload / ZIP sync is Step 6.
 */
export const formAssets = pgTable(
  "form_assets",
  {
    ...primaryId,
    agencyId: agencyId(),
    name: text("name").notNull(),
    description: text("description"),
    kind: text("kind").$type<FormAssetKind>().notNull().default("other"),
    url: text("url").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    width: integer("width"),
    height: integer("height"),
    folder: text("folder"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    scope: text("scope")
      .$type<FormLibraryScope>()
      .notNull()
      .default("organization"),
    visibility: text("visibility")
      .$type<FormLibraryVisibility>()
      .notNull()
      .default("organization"),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    websiteId: uuid("website_id").references(() => websites.id, {
      onDelete: "set null",
    }),
    usageCount: integer("usage_count").notNull().default(0),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("form_assets_agency_idx").on(t.agencyId),
    index("form_assets_kind_idx").on(t.agencyId, t.kind),
    index("form_assets_folder_idx").on(t.agencyId, t.folder),
  ],
);

export type FormComponent = typeof formComponents.$inferSelect;
export type FormSection = typeof formSections.$inferSelect;
export type FormAsset = typeof formAssets.$inferSelect;
