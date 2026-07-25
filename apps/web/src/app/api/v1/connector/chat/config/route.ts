import { authenticateConnector, connectorError } from "@/lib/connector/auth";
import {
  getLeadFormEmbed,
  getPublishedWidgetConfig,
} from "@/lib/cep/cep-service";
import type { CepWidgetPayload } from "@/lib/db/schema";

/**
 * GET /api/v1/connector/chat/config
 *
 * Published bubble (+ optional wizard) theme for the WP widget (no secrets).
 */
export async function GET(request: Request) {
  const identity = await authenticateConnector(request);
  if (!identity) {
    return connectorError("unauthorized", 401, "Invalid connector key.");
  }

  const [bubble, wizard] = await Promise.all([
    getPublishedWidgetConfig(identity.agencyId, identity.websiteId, "bubble"),
    getPublishedWidgetConfig(identity.agencyId, identity.websiteId, "wizard"),
  ]);

  const widget = bubble;
  if (!widget) {
    return Response.json({
      status: "ok",
      widget: null,
      wizard: null,
    });
  }

  const p = (widget.payload ?? {}) as CepWidgetPayload;
  let leadForm: { formId: string; title: string; html: string } | null = null;
  if (p.modules?.leadForm !== false && p.leadFormId) {
    leadForm = await getLeadFormEmbed(
      identity.agencyId,
      identity.clientId,
      p.leadFormId,
    );
  }

  return Response.json({
    status: "ok",
    widget: serializeWidget(widget, p, leadForm),
    wizard: wizard
      ? serializeWidget(
          wizard,
          (wizard.payload ?? {}) as CepWidgetPayload,
          leadForm,
        )
      : null,
  });
}

function serializeWidget(
  widget: { id: string; name: string; surface: string },
  p: CepWidgetPayload,
  leadForm: { formId: string; title: string; html: string } | null,
) {
  return {
    id: widget.id,
    name: widget.name,
    surface: widget.surface,
    title: p.title ?? widget.name,
    greeting: p.greeting ?? "",
    placeholder: p.placeholder ?? "Type a message…",
    theme: p.theme ?? {},
    triggers: p.triggers ?? {},
    modules: p.modules ?? {},
    bot_avatar_url: p.botAvatarUrl ?? null,
    agent_avatar_url: p.agentAvatarUrl ?? null,
    lead_form_id: p.leadFormId ?? null,
    lead_form: leadForm
      ? {
          form_id: leadForm.formId,
          title: leadForm.title,
          html: leadForm.html,
        }
      : null,
    quick_replies: p.quickReplies ?? [],
    ai_provider: p.ai?.provider ?? "openrouter",
  };
}
