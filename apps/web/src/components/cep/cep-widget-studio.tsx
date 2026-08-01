"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type {
  CepAiProvider,
  CepWidget,
  CepWidgetPayload,
  CepWidgetSurface,
} from "@/lib/db/schema";
import { defaultCepWidgetPayload, CEP_AI_PROVIDER_OPTIONS } from "@/lib/db/schema";
import { actionSaveCepWidget } from "@/lib/cep/cep-actions";
import { PageHeader } from "@/components/shell/page-header";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import { DraggablePlacementCanvas } from "@/components/widgets/draggable-placement-canvas";
import {
  FloatingLauncherButton,
  FloatingLauncherGroup,
  FloatingPanelHeader,
  LAUNCHER_ORANGE,
  LauncherSizeControl,
  placementHorizontalAlign,
} from "@/components/widgets/floating-launcher-group";
import {
  normalizeLauncherMetrics,
} from "@/lib/widgets/launcher-size";
import { normalizeWidgetPageTarget } from "@/lib/widgets/page-target";
import {
  cepPositionFromAnchor,
  cornerFromPlacement,
  normalizeScreenPlacement,
  placementFromCorner,
} from "@/lib/widgets/screen-placement";
import { PageDisplayConditions } from "@/components/widgets/page-display-conditions";
import { ImageUrlField } from "@/components/ui/image-url-field";
import {
  ClassicHtmlEditor,
  defaultAgreementHtml,
  sanitizeAgreementHtml,
} from "@/components/ui/classic-html-editor";

const input =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

type StudioTab = "appearance" | "behavior" | "ai" | "setup";

const TABS: { id: StudioTab; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "behavior", label: "Behavior" },
  { id: "ai", label: "AI engine" },
  { id: "setup", label: "Setup" },
];

export type CepStudioHealth = {
  live: boolean;
  modelReady: boolean;
  indexed: boolean;
  embeddingsReady: boolean;
  pluginConnected: boolean;
  chunks: number;
  threads: number;
  used: number;
  limit: number;
  planLabel: string;
  providers: CepAiProvider[];
  knowledgeHref: string;
  websiteHref: string;
};

function statusBadge(status: string) {
  if (status === "published") return "bg-ok/10 text-ok";
  if (status === "archived") return "bg-[#eef2f7] text-faint";
  return "bg-[#eef2f7] text-muted";
}

export function CepWidgetStudio({
  clientId,
  websiteId,
  websiteName,
  initial,
  configuredProviders,
  forms,
  health,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  initial: CepWidget;
  configuredProviders: CepAiProvider[];
  forms: Array<{ id: string; name: string; formNumber: number | null }>;
  health: CepStudioHealth;
}) {
  const defaults = defaultCepWidgetPayload(initial.surface ?? "bubble");
  const [name, setName] = useState(initial.name);
  const [status, setStatus] = useState(initial.status);
  const [enabled, setEnabled] = useState(initial.isEnabled);
  const [surface, setSurface] = useState<CepWidgetSurface>(
    initial.surface ?? "bubble",
  );
  const [tab, setTab] = useState<StudioTab>("appearance");
  const [payload, setPayload] = useState<CepWidgetPayload>(() => ({
    ...defaults,
    ...initial.payload,
    theme: {
      ...defaults.theme,
      ...initial.payload?.theme,
    },
    ai: {
      ...defaults.ai,
      ...initial.payload?.ai,
    },
    triggers: {
      ...defaults.triggers,
      ...initial.payload?.triggers,
    },
    pageTarget: normalizeWidgetPageTarget(
      initial.payload?.pageTarget ?? defaults.pageTarget,
    ),
    modules: {
      ...defaults.modules,
      ...initial.payload?.modules,
    },
  }));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await actionSaveCepWidget({
        id: initial.id,
        clientId,
        websiteId,
        name,
        status,
        surface,
        isEnabled: enabled,
        payload: { ...payload, surface },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  const theme = payload.theme ?? {};
  const ai = payload.ai ?? {};
  const triggers = payload.triggers ?? {};
  const modules = payload.modules ?? {};
  const shortcode = "[avonix_chat]";
  const primary = theme.primaryColor ?? LAUNCHER_ORANGE;
  const chatPlacement = normalizeScreenPlacement(
    theme.leftPercent != null && theme.topPercent != null
      ? { xPercent: theme.leftPercent, yPercent: theme.topPercent }
      : placementFromCorner(theme.position, theme.offsetX, theme.offsetY),
  );
  const chatAvatar = payload.agentAvatarUrl || payload.botAvatarUrl || null;
  const chatMetrics = normalizeLauncherMetrics(
    theme.launcherIconSize != null || theme.launcherPadding != null
      ? {
          iconSize: theme.launcherIconSize,
          buttonPadding: theme.launcherPadding,
        }
      : theme.launcherSize,
  );

  return (
    <div>
      <PageHeader
        title="Live Chat"
        subtitle={`Conversational Experience · ${websiteName}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <span className="text-[12px] font-semibold text-ok">Saved</span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${statusBadge(status)}`}
            >
              {status}
            </span>
            {enabled ? (
              <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[9px] font-bold uppercase text-ok">
                Live
              </span>
            ) : (
              <span className="rounded-full bg-[#eef2f7] px-2 py-0.5 text-[9px] font-bold uppercase text-faint">
                Off
              </span>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save widget"}
            </button>
          </div>
        }
      />

      {/* Metric strip — matches website overview */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          value={health.live ? "On" : "Off"}
          label="AI answering"
          tone={health.live ? "text-ok" : "text-warn"}
          badge={!health.live ? "setup" : undefined}
        />
        <Metric
          value={String(health.chunks)}
          label="Knowledge passages"
          badge={health.chunks === 0 ? "setup" : undefined}
        />
        <Metric
          value={`${health.used.toLocaleString()}`}
          label={`AI replies · ${health.planLabel}`}
          hint={`/ ${health.limit.toLocaleString()}`}
        />
        <Metric value={health.threads.toLocaleString()} label="Chat threads" />
      </div>

      {/* Status callout */}
      <div
        className={`mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
          health.live
            ? "border-ok/25 bg-ok/5"
            : "border-warn/30 bg-[#fff8f3]"
        }`}
      >
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${health.live ? "bg-ok" : "bg-warn"}`}
        />
        <div className="min-w-0">
          {health.live ? (
            <p>
              <b className="font-semibold text-ink">Answering visitors.</b>{" "}
              <span className="text-muted">
                {health.chunks} passages ·{" "}
                {health.providers.length
                  ? health.providers.join(", ")
                  : "no provider key"}
              </span>
            </p>
          ) : (
            <p>
              <b className="font-semibold text-ink">Not answering yet.</b>{" "}
              <span className="text-muted">
                {!health.modelReady
                  ? "Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY — questions are still captured."
                  : "Index site content so the bot has pages to answer from."}
              </span>
            </p>
          )}
        </div>
      </div>

      {error ? (
        <p className="mb-3 rounded-lg bg-[#fef2f2] px-3 py-2 text-[12.5px] font-medium text-bad">
          {error}
        </p>
      ) : null}

      {/* Tab rail */}
      <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              tab === t.id
                ? "bg-brand text-white"
                : "text-muted hover:bg-[#f7f8fb] hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor + live preview */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_0_rgba(11,30,58,.04)]">
          {tab === "appearance" ? (
            <div className="space-y-4">
              <SectionEyebrow>Widget identity</SectionEyebrow>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">Name</span>
                  <input
                    className={`${input} mt-1`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">Status</span>
                  <select
                    className={`${input} mt-1`}
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as "draft" | "published" | "archived",
                      )
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">Surface</span>
                  <select
                    className={`${input} mt-1`}
                    value={surface}
                    onChange={(e) =>
                      setSurface(e.target.value as CepWidgetSurface)
                    }
                  >
                    <option value="bubble">Floating bubble</option>
                    <option value="wizard">Inline wizard</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[12px] font-medium sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                  Enabled on site
                </label>
              </div>

              <SectionEyebrow>Chrome & copy</SectionEyebrow>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">Header title</span>
                  <input
                    className={`${input} mt-1`}
                    value={payload.title ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">Greeting</span>
                  <textarea
                    className={`${input} mt-1 min-h-[72px]`}
                    value={payload.greeting ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({ ...p, greeting: e.target.value }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">
                    Input placeholder
                  </span>
                  <input
                    className={`${input} mt-1`}
                    value={payload.placeholder ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        placeholder: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">Primary color</span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
                      value={primary}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          theme: {
                            ...p.theme,
                            primaryColor: e.target.value,
                            headerColor: e.target.value,
                          },
                        }))
                      }
                    />
                    <input
                      className={input}
                      value={primary}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          theme: {
                            ...p.theme,
                            primaryColor: e.target.value,
                            headerColor: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">
                    Gradient end color
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1"
                      value={theme.primaryColorEnd || primary}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          theme: {
                            ...p.theme,
                            primaryColorEnd: e.target.value,
                          },
                        }))
                      }
                    />
                    <input
                      className={input}
                      value={theme.primaryColorEnd || ""}
                      placeholder="Auto from primary"
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          theme: {
                            ...p.theme,
                            primaryColorEnd: e.target.value || undefined,
                          },
                        }))
                      }
                    />
                  </div>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">
                    Launcher icon style
                  </span>
                  <select
                    className={`${input} mt-1`}
                    value={theme.launcherIcon || "dots"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: {
                          ...p.theme,
                          launcherIcon: e.target.value as "dots" | "compose",
                        },
                      }))
                    }
                  >
                    <option value="dots">Chat bubble · dots</option>
                    <option value="compose">Chat bubble · compose</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">Agent / header name</span>
                  <input
                    className={`${input} mt-1`}
                    value={theme.agentName ?? ""}
                    placeholder={payload.title || "Customer Support"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: { ...p.theme, agentName: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">Status text</span>
                  <input
                    className={`${input} mt-1`}
                    value={theme.statusText ?? ""}
                    placeholder="Online"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: { ...p.theme, statusText: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">Home panel message</span>
                  <textarea
                    className={`${input} mt-1 min-h-[72px]`}
                    value={theme.homeContent ?? ""}
                    placeholder="Hi! Ask me anything about our site…"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: { ...p.theme, homeContent: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">
                    Start Conversation button
                  </span>
                  <input
                    className={`${input} mt-1`}
                    value={theme.startButtonLabel ?? ""}
                    placeholder="Start Conversation"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: { ...p.theme, startButtonLabel: e.target.value },
                      }))
                    }
                  />
                </label>
                <div className="sm:col-span-2">
                  <span className="mb-2 block text-[12px] font-medium">
                    Button size
                  </span>
                  <LauncherSizeControl
                    value={chatMetrics}
                    onChange={({ iconSize, buttonPadding }) =>
                      setPayload((p) => ({
                        ...p,
                        theme: {
                          ...p.theme,
                          launcherIconSize: iconSize,
                          launcherPadding: buttonPadding,
                        },
                      }))
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="mb-2 block text-[12px] font-medium">
                    Live Chat placement
                  </span>
                  <p className="mb-2 text-[12px] text-muted">
                    Drag with your cursor in the live view — no values to type.
                    Independent from Languages and Accessibility.
                  </p>
                  <DraggablePlacementCanvas
                    label="Live Chat group"
                    placement={chatPlacement}
                    onChange={(next) => {
                      const n = normalizeScreenPlacement(next);
                      setPayload((p) => ({
                        ...p,
                        theme: {
                          ...p.theme,
                          leftPercent: n.xPercent,
                          topPercent: n.yPercent,
                          position: cepPositionFromAnchor(
                            cornerFromPlacement(n),
                          ),
                        },
                      }));
                    }}
                  >
                    <FloatingLauncherGroup
                      placement={chatPlacement}
                      open={false}
                      panel={null}
                      launcher={
                        <FloatingLauncherButton
                          label={theme.launcherLabel || "Live chat"}
                          color={primary}
                          colorEnd={theme.primaryColorEnd}
                          metrics={chatMetrics}
                          align={placementHorizontalAlign(chatPlacement)}
                          online={theme.onlineIndicator !== false}
                          shape="circle"
                        >
                          <span style={{ color: primary }} className="grid size-full place-items-center">
                            <ChatGlyph className="size-[54%]" />
                          </span>
                        </FloatingLauncherButton>
                      }
                    />
                  </DraggablePlacementCanvas>
                </div>
                <ImageUrlField
                  label="Bot avatar"
                  value={payload.botAvatarUrl ?? ""}
                  placeholder="https://… or pick from Media"
                  hint="Used for the bot in chat messages and launcher (if no agent avatar)."
                  onChange={(next) =>
                    setPayload((p) => ({
                      ...p,
                      botAvatarUrl: next || undefined,
                    }))
                  }
                />
                <ImageUrlField
                  label="Agent avatar"
                  value={payload.agentAvatarUrl ?? ""}
                  placeholder="https://… or pick from Media"
                  hint="Shown for human-agent messages when available."
                  onChange={(next) =>
                    setPayload((p) => ({
                      ...p,
                      agentAvatarUrl: next || undefined,
                    }))
                  }
                />
                <ImageUrlField
                  className="sm:col-span-2"
                  label="Start-screen hero image"
                  value={theme.startHeroImageUrl ?? ""}
                  placeholder="https://… (optional — default line art if empty)"
                  onChange={(next) =>
                    setPayload((p) => ({
                      ...p,
                      theme: {
                        ...p.theme,
                        startHeroImageUrl: next || undefined,
                      },
                    }))
                  }
                />
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">Privacy policy URL</span>
                  <input
                    className={`${input} mt-1`}
                    value={theme.privacyUrl ?? ""}
                    placeholder="https://yoursite.com/privacy"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: {
                          ...p.theme,
                          privacyUrl: e.target.value || undefined,
                        },
                      }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">Terms of use URL</span>
                  <input
                    className={`${input} mt-1`}
                    value={theme.termsUrl ?? ""}
                    placeholder="https://yoursite.com/terms"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: {
                          ...p.theme,
                          termsUrl: e.target.value || undefined,
                        },
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-[12px] font-medium sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={theme.agreementRequired !== false}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: {
                          ...p.theme,
                          agreementRequired: e.target.checked,
                        },
                      }))
                    }
                  />
                  Require Terms / Privacy agreement at the start of every new chat
                </label>
                {theme.agreementRequired !== false ? (
                  <>
                    <p className="sm:col-span-2 text-[12px] text-muted">
                      Shown every time the chat opens or is reset — not skipped
                      after the first agree.
                    </p>
                    <label className="block">
                      <span className="text-[12px] font-medium">
                        Letter-mark initial (when no logo)
                      </span>
                      <input
                        className={`${input} mt-1`}
                        value={
                          theme.agreementBrandName ??
                          theme.agentName ??
                          payload.title ??
                          ""
                        }
                        placeholder="Customer Support"
                        onChange={(e) =>
                          setPayload((p) => ({
                            ...p,
                            theme: {
                              ...p.theme,
                              agreementBrandName: e.target.value,
                            },
                          }))
                        }
                      />
                    </label>
                    <ImageUrlField
                      label="Agreement logo"
                      value={theme.agreementLogoUrl ?? ""}
                      placeholder="https://… (optional)"
                      hint="Shown as-is (not cropped). Leave empty to use the letter mark."
                      onChange={(next) =>
                        setPayload((p) => ({
                          ...p,
                          theme: {
                            ...p.theme,
                            agreementLogoUrl: next || undefined,
                          },
                        }))
                      }
                    />
                    {theme.agreementLogoUrl ? (
                      <label className="block sm:col-span-2">
                        <span className="mb-1 flex items-center justify-between text-[12px] font-medium">
                          <span>Agreement logo size</span>
                          <span className="font-mono text-[11px] text-muted">
                            {Math.max(
                              24,
                              Math.min(160, Number(theme.agreementLogoSize) || 56),
                            )}
                            px
                          </span>
                        </span>
                        <input
                          type="range"
                          min={24}
                          max={160}
                          step={1}
                          className="mt-1 w-full accent-[var(--brand,#2563eb)]"
                          value={Math.max(
                            24,
                            Math.min(160, Number(theme.agreementLogoSize) || 56),
                          )}
                          onChange={(e) =>
                            setPayload((p) => ({
                              ...p,
                              theme: {
                                ...p.theme,
                                agreementLogoSize: Number(e.target.value),
                              },
                            }))
                          }
                        />
                        <p className="mt-1 text-[11px] text-muted">
                          Height only — width follows the logo’s natural shape.
                        </p>
                      </label>
                    ) : null}
                    <ClassicHtmlEditor
                      className="sm:col-span-2"
                      label="Agreement text"
                      minHeight={180}
                      hint="Edit title, intro, and body here. Select text to bold, change color, or add links (Terms / Privacy)."
                      value={
                        theme.agreementHtml?.trim()
                          ? theme.agreementHtml
                          : defaultAgreementHtml({
                              brand:
                                theme.agreementBrandName ??
                                theme.agentName ??
                                payload.title ??
                                "Customer Support",
                              intro: theme.agreementIntro,
                              body: theme.agreementBody,
                            })
                      }
                      onChange={(html) =>
                        setPayload((p) => ({
                          ...p,
                          theme: {
                            ...p.theme,
                            agreementHtml: sanitizeAgreementHtml(html),
                          },
                        }))
                      }
                    />
                  </>
                ) : null}
                <label className="flex items-center gap-2 text-[12px] font-medium sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={theme.preChatEnabled === true}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: { ...p.theme, preChatEnabled: e.target.checked },
                      }))
                    }
                  />
                  Show contact lead gate (name / phone / email) before chat
                </label>
                <label className="flex items-center gap-2 text-[12px] font-medium sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={theme.openOnLaunch !== false}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: { ...p.theme, openOnLaunch: e.target.checked },
                      }))
                    }
                  />
                  Skip home panel — open AI chat immediately
                </label>
                <label className="flex items-center gap-2 text-[12px] font-medium sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={theme.pulse === true}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        theme: { ...p.theme, pulse: e.target.checked },
                      }))
                    }
                  />
                  Pulse animation on launcher
                </label>
              </div>
            </div>
          ) : null}

          {tab === "behavior" ? (
            <div className="space-y-4">
              <SectionEyebrow>Triggers & embeds</SectionEyebrow>
              <PageDisplayConditions
                label="Floating bubble display"
                value={payload.pageTarget}
                onChange={(pageTarget) =>
                  setPayload((p) => ({ ...p, pageTarget }))
                }
              />
              <p className="text-[12px] text-muted">
                Shortcode embed <code className="text-[11px]">[avonix_chat]</code>{" "}
                always renders in the page container. These conditions only
                control the floating chat icon.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-medium">Open delay (ms)</span>
                  <input
                    className={`${input} mt-1`}
                    type="number"
                    min={0}
                    value={triggers.delayMs ?? 0}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        triggers: {
                          ...p.triggers,
                          delayMs: Number(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">
                    Lead form (Form Builder)
                  </span>
                  <select
                    className={`${input} mt-1`}
                    value={payload.leadFormId ?? ""}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        leadFormId: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">None</option>
                    {forms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.formNumber != null ? ` (#${f.formNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-xl border border-line bg-[#f7f8fb] p-3.5">
                <p className="text-[12px] font-semibold text-ink">
                  Inline wizard shortcode
                </p>
                <p className="mt-1 text-[11px] leading-[1.5] text-muted">
                  Paste into any page for a fluid-width chat. The bubble still
                  auto-loads when chat is enabled in the plugin.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <code className="rounded-md border border-line bg-white px-2.5 py-1.5 font-mono text-[12px] text-ink">
                    {shortcode}
                  </code>
                  <button
                    type="button"
                    className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] font-semibold text-brand hover:bg-brand/5"
                    onClick={async () => {
                      await navigator.clipboard.writeText(shortcode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <SectionEyebrow>Modules</SectionEyebrow>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["leadForm", "Lead form in chat", "Embed Form Builder"],
                    ["transferAgent", "Transfer to human", "Queue + inbox"],
                    ["sounds", "Message sounds", "Soft ping on reply"],
                    ["streaming", "Streaming replies", "Progressive reveal"],
                  ] as const
                ).map(([key, label, hint]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-white px-3 py-2.5 hover:border-brand/30"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={modules[key] !== false}
                      onChange={(e) =>
                        setPayload((p) => ({
                          ...p,
                          modules: { ...p.modules, [key]: e.target.checked },
                        }))
                      }
                    />
                    <span>
                      <span className="block text-[12.5px] font-semibold text-ink">
                        {label}
                      </span>
                      <span className="block text-[11px] text-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "ai" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5">
                <p className="text-[13px] font-semibold text-ink">AI engine</p>
                <p className="mt-1 text-[12px] leading-[1.55] text-muted">
                  Default is OpenRouter with Anthropic fallback. Keys stay in
                  server env — never in the browser. Ready now:{" "}
                  <b className="font-semibold text-ink">
                    {configuredProviders.length
                      ? configuredProviders.join(", ")
                      : "none"}
                  </b>
                  .
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-medium">Provider</span>
                  <select
                    className={`${input} mt-1`}
                    value={ai.provider ?? "openrouter"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        ai: {
                          ...p.ai,
                          provider: e.target.value as CepAiProvider,
                        },
                      }))
                    }
                  >
                    {CEP_AI_PROVIDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                        {configuredProviders.includes(o.value)
                          ? " · ready"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">Model</span>
                  <input
                    className={`${input} mt-1`}
                    value={ai.model ?? ""}
                    placeholder="anthropic/claude-sonnet-4"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        ai: { ...p.ai, model: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">
                    Fallback provider
                  </span>
                  <select
                    className={`${input} mt-1`}
                    value={ai.fallbackProvider ?? "anthropic"}
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        ai: {
                          ...p.ai,
                          fallbackProvider: e.target.value as CepAiProvider,
                        },
                      }))
                    }
                  >
                    {CEP_AI_PROVIDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium">Fallback model</span>
                  <input
                    className={`${input} mt-1`}
                    value={ai.fallbackModel ?? ""}
                    placeholder="claude-sonnet-5"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        ai: { ...p.ai, fallbackModel: e.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[12px] font-medium">
                    System prompt override (optional)
                  </span>
                  <textarea
                    className={`${input} mt-1 min-h-[88px]`}
                    value={ai.systemPromptOverride ?? ""}
                    placeholder="Extra instructions prepended to the site RAG prompt…"
                    onChange={(e) =>
                      setPayload((p) => ({
                        ...p,
                        ai: {
                          ...p.ai,
                          systemPromptOverride: e.target.value,
                        },
                      }))
                    }
                  />
                </label>
              </div>
            </div>
          ) : null}

          {tab === "setup" ? (
            <div className="space-y-1">
              <SetupRow
                ok={health.modelReady}
                label="AI provider key"
                detail={
                  health.modelReady
                    ? health.providers.join(", ")
                    : "OPENROUTER_API_KEY or ANTHROPIC_API_KEY"
                }
              />
              <SetupRow
                ok={health.indexed}
                label="Site content"
                detail={
                  health.indexed
                    ? `${health.chunks} passages indexed`
                    : "Nothing crawled yet"
                }
                href={health.knowledgeHref}
                hrefLabel={health.indexed ? "Manage" : "Crawl now"}
              />
              <SetupRow
                ok={health.embeddingsReady}
                label="Embeddings"
                detail={
                  health.embeddingsReady
                    ? "voyage-4-lite, 1024 dimensions"
                    : "No key — retrieval falls back to Postgres full-text"
                }
                warnOnly
              />
              <SetupRow
                ok={health.pluginConnected}
                label="WordPress plugin"
                detail={
                  health.pluginConnected
                    ? "Connected — widget can load on the site"
                    : "Not connected — install the connector"
                }
                href={health.websiteHref}
                hrefLabel="Install"
              />
              <div className="mt-4 rounded-xl border border-line bg-[#f7f8fb] px-3.5 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
                  How it behaves
                </p>
                <ul className="mt-2 space-y-1.5 text-[12.5px] leading-[1.55] text-muted">
                  <li>Answers only from this site&apos;s own pages.</li>
                  <li>
                    Dual brain: AI until transfer, then inbox replies appear in
                    the widget.
                  </li>
                  <li>
                    Inline wizard via{" "}
                    <code className="text-ink">{shortcode}</code>.
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </section>

        {/* Live preview stage */}
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-xl border border-line bg-[#eef1f6] shadow-[0_1px_0_rgba(11,30,58,.04)]">
            <div className="flex items-center justify-between border-b border-[#e2e7ef] px-3.5 py-2.5">
              <p className="text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
                Live preview
              </p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted">
                {surface === "wizard" ? "Wizard" : "Bubble"}
              </span>
            </div>
            <div className="relative flex min-h-[420px] items-end justify-center p-5">
              {/* faux page backdrop */}
              <div
                className="pointer-events-none absolute inset-4 rounded-lg bg-white/70"
                aria-hidden
              />
              <div
                className={`relative z-[1] flex w-full flex-col ${
                  surface === "wizard" ? "items-stretch" : "items-end"
                } gap-3`}
              >
                <div
                  className="flex w-full max-w-[320px] flex-col overflow-hidden bg-white shadow-[0_24px_60px_-28px_rgba(11,30,58,0.45)]"
                  style={{
                    borderRadius: theme.radius ?? 16,
                    color: theme.textColor ?? "#13233c",
                    ...(surface === "wizard"
                      ? { maxWidth: "100%" }
                      : { marginLeft: "auto" }),
                  }}
                >
                  <div
                    className="flex items-center gap-2.5 px-3.5 py-3 text-[13px] font-bold text-white"
                    style={{
                      background:
                        theme.headerColor || theme.primaryColor || "#ff6600",
                    }}
                  >
                    {payload.botAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={payload.botAvatarUrl}
                        alt=""
                        className="size-8 rounded-full object-cover ring-2 ring-white/30"
                      />
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full bg-white/20 text-[11px] font-bold">
                        AI
                      </span>
                    )}
                    <span className="truncate">
                      {payload.title || "Chat with us"}
                    </span>
                    {theme.onlineIndicator !== false ? (
                      <span className="ml-auto size-2 rounded-full bg-[#22c55e] ring-2 ring-white/40" />
                    ) : null}
                  </div>
                  <div className="space-y-2.5 bg-[#f7f8fa] px-3.5 py-3.5 text-[12.5px] leading-[1.45]">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-line bg-white px-3 py-2 shadow-sm">
                      {payload.greeting || "Hi! How can we help?"}
                    </div>
                    {(payload.quickReplies ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(payload.quickReplies ?? []).slice(0, 3).map((q) => (
                          <span
                            key={q.id}
                            className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              borderColor: primary,
                              color: primary,
                            }}
                          >
                            {q.label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 border-t border-line bg-white px-2.5 py-2.5">
                    <div className="min-w-0 flex-1 truncate rounded-lg border border-[#dbe1ea] px-2.5 py-2 text-[11px] text-faint">
                      {payload.placeholder || "Type a message…"}
                    </div>
                    <div
                      className="shrink-0 rounded-lg px-2.5 py-2 text-[11px] font-bold text-white"
                      style={{ background: primary }}
                    >
                      Send
                    </div>
                  </div>
                </div>

                {surface !== "wizard" ? (
                  <button
                    type="button"
                    className="relative rounded-full px-5 py-3 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,.18)]"
                    style={{ background: primary }}
                  >
                    {theme.launcherLabel || "Chat"}
                    {theme.onlineIndicator !== false ? (
                      <span className="absolute top-1 right-1 size-2.5 rounded-full border-2 border-white bg-[#22c55e]" />
                    ) : null}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  value,
  label,
  hint,
  tone,
  badge,
}: {
  value: string;
  label: string;
  hint?: string;
  tone?: string;
  badge?: SetupBadgeKind;
}) {
  return (
    <div className="rounded-[10px] border border-line bg-white px-4 pt-4 pb-3.5 shadow-[0_1px_0_rgba(11,30,58,.04)]">
      <div
        className={`text-2xl font-bold tracking-[-0.02em] ${badge ? "text-bad" : `text-ink ${tone ?? ""}`}`}
      >
        {badge ? (
          <SetupBadge kind={badge} size="lg" />
        ) : (
          <>
            {value}
            {hint ? (
              <span className="text-[13px] font-medium text-faint"> {hint}</span>
            ) : null}
          </>
        )}
      </div>
      <div className="mt-[3px] text-[12.5px] text-muted">{label}</div>
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.08em] text-faint uppercase">
      {children}
    </p>
  );
}

function SetupRow({
  ok,
  label,
  detail,
  href,
  hrefLabel,
  warnOnly,
}: {
  ok: boolean;
  label: string;
  detail: string;
  href?: string;
  hrefLabel?: string;
  warnOnly?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#f1f4f8] py-3 text-[13px] last:border-0">
      <span
        className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
          ok ? "bg-ok" : warnOnly ? "bg-warn" : "bg-[#c9d2de]"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        <span className="block text-[12.5px] text-muted">{detail}</span>
      </span>
      {href && !ok ? (
        <Link
          href={href as never}
          className="ml-auto shrink-0 text-[12.5px] font-semibold text-brand hover:underline"
        >
          {hrefLabel} →
        </Link>
      ) : null}
    </div>
  );
}

/** Dual speech-bubble chat mark. */
function ChatGlyph({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#fff"
        d="M10 12c0-2.2 1.8-4 4-4h20c2.2 0 4 1.8 4 4v16c0 2.2-1.8 4-4 4H22l-8 8v-8h0c-2.2 0-4-1.8-4-4V12z"
      />
      <circle cx="18" cy="20" r="2.4" fill="currentColor" />
      <circle cx="24" cy="20" r="2.4" fill="currentColor" />
      <circle cx="30" cy="20" r="2.4" fill="currentColor" />
    </svg>
  );
}
