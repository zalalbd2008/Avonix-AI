import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { primaryId, timestamps } from "./_shared";
import { agencyId } from "./_tenant";
import { websites } from "./websites";

/**
 * What a tracked element was.
 *
 * `pageview` is not in the prototype's list, and without it the analytics panel
 * has no denominator — a conversion rate needs visits, and inventing that number
 * is the exact thing this product does not do. The connector sends one per page
 * load; the other three come from clicks on marked elements.
 */
export const trackedEventTypeEnum = pgEnum("tracked_event_type", [
  "pageview",
  "button",
  "consultation",
  "form",
]);

/**
 * Class-based activity tracking (spec §8.3).
 *
 * An agency adds a class like `avx-track-book` to a link or button on the
 * client's site; the connector's script reports each click. Nothing is tracked
 * unless it is marked, which is the whole design: no blanket surveillance of a
 * visitor's every move, only the handful of actions the agency said matter.
 *
 * High write volume and never updated, so no `updatedAt` and no soft delete.
 */
export const trackedEvents = pgTable(
  "tracked_events",
  {
    ...primaryId,
    agencyId: agencyId(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    eventType: trackedEventTypeEnum("event_type").notNull(),
    /** What the visitor saw — the button's text. */
    elementLabel: text("element_label"),
    /** The marker class that caused this to be tracked. */
    cssClass: text("css_class"),
    /** Why the agency tracks it, set once on the class and echoed back. */
    purpose: text("purpose"),
    pagePath: text("page_path").notNull(),

    /**
     * Stored full; masked at render time when the share link says so (§13).
     * Masking on write would make the choice irreversible for the agency's own
     * reports, which is a worse default than masking on read.
     */
    ipAddress: text("ip_address"),
    country: text("country"),
    city: text("city"),
    device: text("device"),
    browser: text("browser"),

    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("tracked_events_website_idx").on(t.websiteId, t.createdAt),
    index("tracked_events_type_idx").on(t.websiteId, t.eventType),
    index("tracked_events_agency_idx").on(t.agencyId),
  ],
);

export type TrackedEventBranding = {
  logoUrl: string | null;
  footerCredit: string;
  phone: string;
  email: string;
};

/**
 * A public, read-only report link (spec §8, Share Link).
 *
 * The slug is unguessable rather than sequential: this URL needs no login, so
 * a guessable one is the whole access control gone. `enabled` is a kill switch
 * that keeps the row — revoking a link and later restoring it should not mint a
 * new URL the client has to be sent again.
 */
export const reportShares = pgTable(
  "report_shares",
  {
    ...primaryId,
    agencyId: agencyId(),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),

    slug: text("slug").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    /** Renders on the shared page and on exports — the white-label half of §8.5. */
    branding: jsonb("branding").$type<TrackedEventBranding>().notNull().default({
      logoUrl: null,
      footerCredit: "",
      phone: "",
      email: "",
    }),
    /** GDPR note in §13: the agency decides whether visitors' IPs are shown. */
    maskIps: boolean("mask_ips").notNull().default(true),
    createdBy: text("created_by"),

    ...timestamps,
  },
  (t) => [
    // Global, not per-tenant: the slug is looked up with no tenant set, because
    // the visitor has no session to derive one from.
    uniqueIndex("report_shares_slug_key").on(t.slug),
    // One link per website, so "share" is idempotent rather than a slug factory.
    uniqueIndex("report_shares_website_key").on(t.websiteId),
  ],
);

export type TrackedEvent = typeof trackedEvents.$inferSelect;
export type ReportShare = typeof reportShares.$inferSelect;
