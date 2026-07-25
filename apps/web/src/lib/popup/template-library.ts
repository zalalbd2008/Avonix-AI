/**
 * Popup template save destinations — mirrors Form Template Library UX.
 */
import type {
  PopupCategory,
  PopupTemplateScope,
  PopupTemplateStatus,
  PopupTemplateVisibility,
} from "@/lib/db/schema";
import {
  TEMPLATE_SAVE_DESTINATIONS,
  canSaveDestination,
  parseTags,
  type TemplateSaveDestination,
} from "@/lib/forms/template-library";
import { POPUP_CATEGORIES } from "@/lib/popup/defaults";

export type PopupTemplateSaveDestination = TemplateSaveDestination;

export const POPUP_TEMPLATE_SAVE_DESTINATIONS = TEMPLATE_SAVE_DESTINATIONS.map(
  (d) =>
    d.id === "website"
      ? {
          ...d,
          hint: "Visible on this website’s popup library",
        }
      : d,
);

export const POPUP_TEMPLATE_CATEGORIES = POPUP_CATEGORIES;

export { canSaveDestination, parseTags };

export function popupDestinationToScopeStatus(
  dest: PopupTemplateSaveDestination,
): {
  scope: PopupTemplateScope;
  status: PopupTemplateStatus;
  visibility: PopupTemplateVisibility;
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

export function isValidPopupCategory(
  value: string,
): value is PopupCategory {
  return POPUP_CATEGORIES.some((c) => c.value === value);
}
