/**
 * Cloud template library helpers — destinations, filters (ADR-007 Step 1).
 * Browser-safe types; DB access lives in template-service.ts.
 */

import type {
  FormField,
  FormSettings,
  FormTemplateCategory,
  FormTemplateScope,
  FormTemplateStatus,
  FormTemplateVisibility,
} from "@/lib/db/schema";

export type TemplateSaveDestination =
  | "website"
  | "organization"
  | "personal"
  | "global"
  | "team"
  | "draft";

export const TEMPLATE_SAVE_DESTINATIONS: {
  id: TemplateSaveDestination;
  label: string;
  hint: string;
  /** Soft role gate — enforced in template-service. */
  minRole?: "member" | "admin" | "owner";
}[] = [
  {
    id: "website",
    label: "Save to This Website",
    hint: "Visible on this website’s form library",
  },
  {
    id: "organization",
    label: "Save to Organization Library",
    hint: "Shared with everyone in this organization",
  },
  {
    id: "personal",
    label: "Save as Personal Template",
    hint: "Only you can see and use it",
  },
  {
    id: "global",
    label: "Save as Global Template",
    hint: "Official org template (owner / admin)",
    minRole: "admin",
  },
  {
    id: "team",
    label: "Save as Team Template",
    hint: "Shared with a team (team id optional for now)",
  },
  {
    id: "draft",
    label: "Save as Draft Template",
    hint: "Not published — keep editing later",
  },
];

export const TEMPLATE_CATEGORIES: {
  id: FormTemplateCategory;
  label: string;
}[] = [
  { id: "contact", label: "Contact Forms" },
  { id: "lead", label: "Lead Forms" },
  { id: "booking", label: "Booking Forms" },
  { id: "survey", label: "Survey Forms" },
  { id: "quiz", label: "Quiz Forms" },
  { id: "registration", label: "Registration Forms" },
  { id: "payment", label: "Payment Forms" },
  { id: "popup", label: "Popup Forms" },
  { id: "multi_step", label: "Multi-step Forms" },
  { id: "conversational", label: "Conversational Forms" },
  { id: "other", label: "Other" },
];

export const TEMPLATE_SCOPE_FILTERS: {
  id: FormTemplateScope | "all";
  label: string;
}[] = [
  { id: "all", label: "All scopes" },
  { id: "organization", label: "Organization" },
  { id: "website", label: "Website" },
  { id: "personal", label: "Personal" },
  { id: "global", label: "Global" },
  { id: "team", label: "Team" },
];

export const TEMPLATE_STATUS_FILTERS: {
  id: FormTemplateStatus | "all";
  label: string;
}[] = [
  { id: "all", label: "All status" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Draft" },
  { id: "pending_approval", label: "Pending approval" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Archived" },
  { id: "deprecated", label: "Deprecated" },
];

export const TEMPLATE_SHARE_PERMISSIONS: {
  id: "view" | "duplicate" | "edit" | "publish";
  label: string;
}[] = [
  { id: "view", label: "View" },
  { id: "duplicate", label: "Duplicate" },
  { id: "edit", label: "Edit" },
  { id: "publish", label: "Publish" },
];

export type TemplateLibrarySort =
  | "updated"
  | "name"
  | "used"
  | "created";

export const TEMPLATE_SORT_OPTIONS: {
  id: TemplateLibrarySort;
  label: string;
}[] = [
  { id: "updated", label: "Recently updated" },
  { id: "used", label: "Most used" },
  { id: "name", label: "Name A–Z" },
  { id: "created", label: "Recently created" },
];

export type TemplateQuickFilter =
  | "all"
  | "favorites"
  | "mine"
  | "shared";

export const TEMPLATE_QUICK_FILTERS: {
  id: TemplateQuickFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "mine", label: "My templates" },
  { id: "shared", label: "Shared with me" },
];

export type PreviewBreakpoint = "desktop" | "tablet" | "mobile";

export const PREVIEW_BREAKPOINTS: {
  id: PreviewBreakpoint;
  label: string;
  frameMax: string;
}[] = [
  { id: "desktop", label: "Desktop", frameMax: "100%" },
  { id: "tablet", label: "Tablet", frameMax: "768px" },
  { id: "mobile", label: "Mobile", frameMax: "390px" },
];

export type TemplateSnapshot = {
  name: string;
  description?: string;
  fields: FormField[];
  settings: FormSettings;
  submitLabel?: string;
  successMessage?: string;
  category?: FormTemplateCategory;
  tags?: string[];
  sourceFormId?: string;
  clientId?: string | null;
  websiteId?: string | null;
};

export function destinationToScopeStatus(dest: TemplateSaveDestination): {
  scope: FormTemplateScope;
  status: FormTemplateStatus;
  visibility: FormTemplateVisibility;
} {
  switch (dest) {
    case "website":
      return {
        scope: "website",
        status: "published",
        visibility: "organization",
      };
    case "organization":
      return {
        scope: "organization",
        status: "published",
        visibility: "organization",
      };
    case "personal":
      return { scope: "personal", status: "published", visibility: "private" };
    case "global":
      return { scope: "global", status: "published", visibility: "public" };
    case "team":
      return { scope: "team", status: "published", visibility: "team" };
    case "draft":
      return { scope: "organization", status: "draft", visibility: "private" };
  }
}

export function parseTags(raw: string): string[] {
  return raw
    .split(/[,#]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

export function canSaveDestination(
  dest: TemplateSaveDestination,
  role: "owner" | "admin" | "member",
): boolean {
  const def = TEMPLATE_SAVE_DESTINATIONS.find((d) => d.id === dest);
  if (!def?.minRole) return true;
  if (def.minRole === "owner") return role === "owner";
  if (def.minRole === "admin") return role === "owner" || role === "admin";
  return true;
}
