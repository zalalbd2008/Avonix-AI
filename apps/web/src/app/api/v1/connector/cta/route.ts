import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import { rateLimit } from "@/lib/connector/rate-limit";
import { getPublishedCtaConfig } from "@/lib/cta/cta-service";
import { getCtaIcon } from "@/lib/cta/icons";
import { mergeButtonDesign } from "@/lib/cta/button-design";

/**
 * GET /api/v1/connector/cta
 *
 * Published CTA groups + buttons for this website. The WP connector caches
 * briefly client-side; rules (page/device) are evaluated in the injector.
 */
export async function GET(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const limit = await rateLimit(`cta:${identity.websiteId}`, 600, 3600);
  if (!limit.ok) {
    return connectorError("rate_limited", 429, "Too many requests.", {
      retry_after: limit.retryAfterSeconds,
    });
  }

  const config = await getPublishedCtaConfig(
    identity.agencyId,
    identity.websiteId,
  );

  return Response.json({
    website_id: identity.websiteId,
    groups: config.groups.map((g) => ({
      id: g.id,
      name: g.name,
      priority_rank: g.priorityRank,
      settings: g.settings,
      buttons: g.buttons.map((b) => {
        const icon = getCtaIcon(b.payload.iconKey);
        const design = mergeButtonDesign(b.payload.style);
        return {
          id: b.id,
          name: b.name,
          sort_order: b.sortOrder,
          label: b.payload.label,
          subtitle: b.payload.subtitle ?? null,
          aria_label:
            design.a11y.ariaLabel ||
            b.payload.ariaLabel ||
            b.payload.label,
          tooltip: b.payload.tooltip ?? design.tooltip?.text ?? null,
          badge: design.badge?.enabled
            ? design.badge
            : b.payload.badge
              ? {
                  enabled: true,
                  text: b.payload.badge,
                  bg: "#0b1e3a",
                  textColor: "#fff",
                }
              : null,
          icon_key:
            design.icon.key !== "none" ? design.icon.key : b.payload.iconKey,
          icon_pack: design.icon.pack,
          icon_fa_style: design.icon.faStyle ?? "solid",
          icon_custom_url: design.icon.customUrl || null,
          icon_emoji: icon.emoji,
          event_name: b.payload.eventName ?? null,
          action: b.payload.action,
          design,
          style: {
            bg: design.colors.normal.bg,
            text: design.colors.normal.text,
            paddingVertical: design.layout.paddingY,
            paddingHorizontal: design.layout.paddingX,
            radius: design.layout.radius,
            hoverEffect: design.hover.effect,
            fontSize: design.typography.size.mobile,
            displayMode: design.displayMode ?? "inline",
            fontFamily: design.typography.fontFamily,
            fontWeight: design.typography.weight,
            widthMode: design.layout.widthMode,
            visibility: design.visibility,
          },
          conditions: b.payload.conditions ?? null,
          analytics_id: b.payload.analyticsId ?? null,
        };
      }),
    })),
  });
}
