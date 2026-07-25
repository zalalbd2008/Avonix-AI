"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { DraggablePlacementCanvas } from "@/components/widgets/draggable-placement-canvas";
import {
  FloatingLauncherButton,
  FloatingLauncherGroup,
  FloatingPanelHeader,
  LauncherSizeControl,
  UniversalAccessGlyph,
  placementHorizontalAlign,
} from "@/components/widgets/floating-launcher-group";
import { actionSaveAccessibility } from "@/lib/accessibility/actions";
import {
  accessibilityScore,
  countEnabledFeatures,
  countEnabledProfiles,
  mergeAccessibilitySettings,
  type AccessibilityIconStyle,
  type AccessibilitySettings,
  type AccessibilityTargetLevel,
} from "@/lib/accessibility/types";
import {
  cornerFromPlacement,
  normalizeScreenPlacement,
  placementLabel,
  type ScreenPlacement,
} from "@/lib/widgets/screen-placement";

type TabId =
  | "overview"
  | "widget"
  | "profiles"
  | "vision"
  | "typography"
  | "content"
  | "navigation"
  | "statement"
  | "compliance";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "widget", label: "Widget" },
  { id: "profiles", label: "Profiles" },
  { id: "vision", label: "Vision" },
  { id: "typography", label: "Typography" },
  { id: "content", label: "Content" },
  { id: "navigation", label: "Navigation" },
  { id: "statement", label: "Statement" },
  { id: "compliance", label: "Compliance" },
];

const ICONS: { id: AccessibilityIconStyle; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "minimal", label: "Minimal" },
];

const LEVELS: AccessibilityTargetLevel[] = ["A", "AA", "AAA"];

const input =
  "w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

export function AccessibilityStudio({
  clientId,
  websiteId,
  websiteName,
  websiteUrl,
  initial,
}: {
  clientId: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  initial?: Partial<AccessibilitySettings> | null;
}) {
  const [settings, setSettings] = useState(() =>
    mergeAccessibilitySettings(initial),
  );
  const [tab, setTab] = useState<TabId>("overview");
  const [previewTool, setPreviewTool] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => accessibilityScore(settings), [settings]);
  const featureCount = countEnabledFeatures(settings);
  const profileCount = countEnabledProfiles(settings);
  const totalFeatures = Object.keys(settings.features).length;

  function patch(partial: Partial<AccessibilitySettings>) {
    setSettings((s) => ({ ...s, ...partial }));
  }

  function setPlacement(placement: ScreenPlacement) {
    const next = normalizeScreenPlacement(placement);
    setSettings((s) => ({
      ...s,
      placement: next,
      position: cornerFromPlacement(next),
    }));
  }

  function patchFeature(
    key: keyof AccessibilitySettings["features"],
    value: boolean,
  ) {
    setSettings((s) => ({
      ...s,
      features: { ...s.features, [key]: value },
    }));
  }

  function patchProfile(
    key: keyof AccessibilitySettings["profiles"],
    value: boolean,
  ) {
    setSettings((s) => ({
      ...s,
      profiles: { ...s.profiles, [key]: value },
    }));
  }

  function patchStatement(
    partial: Partial<AccessibilitySettings["statement"]>,
  ) {
    setSettings((s) => ({
      ...s,
      statement: { ...s.statement, ...partial },
    }));
  }

  function setAllFeatures(value: boolean) {
    setSettings((s) => {
      const features = { ...s.features };
      for (const k of Object.keys(features) as (keyof typeof features)[]) {
        features[k] = value;
      }
      return { ...s, features };
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await actionSaveAccessibility({
        clientId,
        websiteId,
        settings,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  }

  const scoreTone =
    score >= 70 ? "text-ok" : score >= 40 ? "text-warn" : "text-bad";

  return (
    <div className="-mx-6 -my-[26px] flex min-h-[calc(100vh-50px)] flex-col bg-white">
      <header className="shrink-0 border-b border-[#e8edf5] px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-10 place-items-center rounded-xl bg-[#f1f5f9] text-brand">
              <UniversalAccessGlyph className="size-5" />
            </span>
            <div>
              <p className="text-[12px] text-muted">Website workspace</p>
              <h1 className="text-[22px] font-bold tracking-tight text-ink">
                Accessibility
              </h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
                Widget, profiles, and compliance tools for {websiteName}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <span className="text-[12px] font-semibold text-ok">Saved</span>
            ) : null}
            {error ? (
              <span className="max-w-[220px] text-[12px] font-medium text-bad">
                {error}
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                settings.enabled
                  ? "bg-ok/10 text-ok"
                  : "bg-[#eef2f7] text-faint"
              }`}
            >
              {settings.enabled ? "Widget on" : "Widget off"}
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => patch({ enabled: !settings.enabled })}
              className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] font-semibold text-ink hover:bg-[#f8fafc] disabled:opacity-60"
            >
              {settings.enabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[#e8edf5] px-6 py-4 sm:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric value={`${score}`} label="Readiness score" tone={scoreTone} hint="/ 100" />
          <Metric
            value={String(featureCount)}
            label="Tools enabled"
            hint={`/ ${totalFeatures}`}
          />
          <Metric value={String(profileCount)} label="Profiles" hint="/ 6" />
          <Metric
            value={settings.targetLevel}
            label="WCAG target"
            tone="text-ink"
          />
        </div>
        <div
          className={`mt-3 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-[13px] ${
            settings.enabled
              ? "border-ok/25 bg-ok/5"
              : "border-warn/30 bg-[#fff8f3]"
          }`}
        >
          <span
            className={`mt-1.5 size-2 shrink-0 rounded-full ${
              settings.enabled ? "bg-ok" : "bg-warn"
            }`}
          />
          <p>
            {settings.enabled ? (
              <>
                <b className="font-semibold text-ink">Widget live for visitors.</b>{" "}
                <span className="text-muted">
                  {featureCount} tools · WCAG {settings.targetLevel} target ·{" "}
                  {websiteUrl.replace(/^https?:\/\//, "")}
                </span>
              </>
            ) : (
              <>
                <b className="font-semibold text-ink">Widget is off.</b>{" "}
                <span className="text-muted">
                  Configure tools below, then enable and save to publish on this
                  site.
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col xl:flex-row">
        <div className="min-w-0 flex-1 border-b border-[#e8edf5] xl:border-b-0 xl:border-r">
          <nav className="flex gap-1 overflow-x-auto border-b border-[#e8edf5] px-4 py-2 sm:px-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                  tab === t.id
                    ? "bg-[#f1f5f9] text-ink"
                    : "text-muted hover:bg-[#f8fafc] hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="space-y-5 p-4 sm:p-6">
            {tab === "overview" && (
              <>
                <Section
                  title="Quick actions"
                  subtitle="Turn the whole experience on or reset tools"
                >
                  <div className="flex flex-wrap gap-2">
                    <ActionChip
                      label={settings.enabled ? "Disable widget" : "Enable widget"}
                      onClick={() => patch({ enabled: !settings.enabled })}
                    />
                    <ActionChip
                      label="Enable all tools"
                      onClick={() => setAllFeatures(true)}
                    />
                    <ActionChip
                      label="Disable all tools"
                      onClick={() => setAllFeatures(false)}
                    />
                    <ActionChip
                      label="WCAG AA preset"
                      onClick={() => {
                        setSettings((s) => {
                          const features = { ...s.features };
                          for (const k of Object.keys(
                            features,
                          ) as (keyof typeof features)[]) {
                            features[k] = true;
                          }
                          features.voiceNavigation = false;
                          features.hideImages = false;
                          return {
                            ...s,
                            targetLevel: "AA",
                            features,
                            statement: { ...s.statement, enabled: true },
                          };
                        });
                      }}
                    />
                  </div>
                </Section>

                <Section
                  title="At a glance"
                  subtitle="What visitors and auditors will see"
                >
                  <InfoLine label="Widget" value={settings.enabled ? "On" : "Off"} />
                  <InfoLine
                    label="Position"
                    value={placementLabel(settings.placement)}
                  />
                  <InfoLine label="Language" value={settings.language} />
                  <InfoLine
                    label="Statement page"
                    value={settings.statement.enabled ? "Published" : "Hidden"}
                  />
                  <InfoLine
                    label="Auto scan"
                    value={settings.autoScan ? "Scheduled" : "Manual"}
                  />
                  <InfoLine
                    label="Remember prefs"
                    value={settings.persistVisitorPrefs ? "Yes" : "No"}
                  />
                </Section>

                <Section
                  title="Score breakdown"
                  subtitle="Configuration readiness — not a live page audit"
                >
                  <ScoreBar label="Widget enabled" value={settings.enabled ? 20 : 0} max={20} />
                  <ScoreBar
                    label="Tools"
                    value={Math.round((featureCount / totalFeatures) * 35)}
                    max={35}
                  />
                  <ScoreBar
                    label="Profiles"
                    value={Math.round((profileCount / 6) * 15)}
                    max={15}
                  />
                  <ScoreBar
                    label="Statement"
                    value={
                      (settings.statement.enabled ? 10 : 0) +
                      (settings.statement.companyName.trim() ? 5 : 0) +
                      (settings.statement.contactEmail.trim() ? 5 : 0) +
                      (settings.statement.lastReviewed.trim() ? 5 : 0)
                    }
                    max={25}
                  />
                </Section>
              </>
            )}

            {tab === "widget" && (
              <>
                <Section
                  title="Appearance"
                  subtitle="Launcher button visitors open on the site"
                >
                  <Field label="Button label">
                    <input
                      className={input}
                      value={settings.label}
                      onChange={(e) => patch({ label: e.target.value })}
                      maxLength={40}
                    />
                  </Field>
                  <Field label="Primary color">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={(e) => patch({ primaryColor: e.target.value })}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-[#e8edf5] bg-white p-1"
                      />
                      <input
                        className={input}
                        value={settings.primaryColor}
                        onChange={(e) => patch({ primaryColor: e.target.value })}
                      />
                    </div>
                  </Field>
                  <Field label="Icon style">
                    <div className="grid grid-cols-3 gap-2">
                      {ICONS.map((i) => (
                        <SelectCard
                          key={i.id}
                          active={settings.iconStyle === i.id}
                          label={i.label}
                          onClick={() => patch({ iconStyle: i.id })}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field label="Button size">
                    <LauncherSizeControl
                      value={{
                        iconSize: settings.iconSize,
                        buttonPadding: settings.buttonPadding,
                      }}
                      onChange={({ iconSize, buttonPadding }) =>
                        patch({ iconSize, buttonPadding })
                      }
                    />
                  </Field>
                  <Field label="Placement">
                    <p className="mb-2 text-[12px] text-muted">
                      Move the Accessibility group in the live preview with your
                      cursor — no values to type. Independent from Languages and
                      Live Chat.
                    </p>
                  </Field>
                </Section>

                <Section title="Behavior" subtitle="Where and how the launcher appears">
                  <Field label="Language">
                    <select
                      className={input}
                      value={settings.language}
                      onChange={(e) => patch({ language: e.target.value })}
                    >
                      <option value="auto">Match site language</option>
                      <option value="en">English</option>
                      <option value="bn">বাংলা</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="ar">العربية</option>
                    </select>
                  </Field>
                  <Toggle
                    label="Hide on mobile"
                    description="Keep the launcher desktop-only"
                    checked={settings.hideOnMobile}
                    onChange={(v) => patch({ hideOnMobile: v })}
                  />
                  <Toggle
                    label="Remember visitor preferences"
                    description="Store choices in local storage on their browser"
                    checked={settings.persistVisitorPrefs}
                    onChange={(v) => patch({ persistVisitorPrefs: v })}
                  />
                  <Toggle
                    label="Announce changes to screen readers"
                    description="Live region updates when tools toggle"
                    checked={settings.announceChanges}
                    onChange={(v) => patch({ announceChanges: v })}
                  />
                  <Field label="Exclude URL paths (one per line)">
                    <textarea
                      className={`${input} min-h-[88px] font-mono text-[12px]`}
                      placeholder={"/checkout\n/admin"}
                      value={settings.excludePaths}
                      onChange={(e) => patch({ excludePaths: e.target.value })}
                    />
                  </Field>
                </Section>
              </>
            )}

            {tab === "profiles" && (
              <Section
                title="One-click profiles"
                subtitle="Preset combinations visitors can apply instantly"
              >
                <Toggle
                  label="Visually impaired"
                  description="Larger text, high contrast, highlight links"
                  checked={settings.profiles.visuallyImpaired}
                  onChange={(v) => patchProfile("visuallyImpaired", v)}
                />
                <Toggle
                  label="Seizure safe"
                  description="Stops animations and flashing content"
                  checked={settings.profiles.seizureSafe}
                  onChange={(v) => patchProfile("seizureSafe", v)}
                />
                <Toggle
                  label="ADHD friendly"
                  description="Reading mask and reduced distractions"
                  checked={settings.profiles.adhdFriendly}
                  onChange={(v) => patchProfile("adhdFriendly", v)}
                />
                <Toggle
                  label="Cognitive disability"
                  description="Readable font, spacing, simplified reading aids"
                  checked={settings.profiles.cognitiveDisability}
                  onChange={(v) => patchProfile("cognitiveDisability", v)}
                />
                <Toggle
                  label="Blind users"
                  description="Screen-reader oriented announcements and skip links"
                  checked={settings.profiles.blindUsers}
                  onChange={(v) => patchProfile("blindUsers", v)}
                />
                <Toggle
                  label="Motor impaired"
                  description="Large click areas and keyboard navigation"
                  checked={settings.profiles.motorImpaired}
                  onChange={(v) => patchProfile("motorImpaired", v)}
                />
              </Section>
            )}

            {tab === "vision" && (
              <Section
                title="Color & vision"
                subtitle="Tools for low vision and color perception"
              >
                <FeatureGrid
                  items={[
                    ["contrast", "Contrast modes"],
                    ["highContrast", "High contrast"],
                    ["darkContrast", "Dark contrast"],
                    ["lightContrast", "Light contrast"],
                    ["grayscale", "Grayscale"],
                    ["invertColors", "Invert colors"],
                    ["brightness", "Brightness"],
                    ["saturation", "Saturation"],
                  ]}
                  features={settings.features}
                  onToggle={patchFeature}
                  onPreview={setPreviewTool}
                />
              </Section>
            )}

            {tab === "typography" && (
              <Section
                title="Typography"
                subtitle="Readable text for every visitor"
              >
                <FeatureGrid
                  items={[
                    ["fontSize", "Font size"],
                    ["readableFont", "Readable font"],
                    ["dyslexiaFont", "Dyslexia-friendly font"],
                    ["lineHeight", "Line height"],
                    ["letterSpacing", "Letter spacing"],
                    ["textAlign", "Text alignment"],
                  ]}
                  features={settings.features}
                  onToggle={patchFeature}
                  onPreview={setPreviewTool}
                />
              </Section>
            )}

            {tab === "content" && (
              <Section
                title="Content aids"
                subtitle="Help visitors focus and parse the page"
              >
                <FeatureGrid
                  items={[
                    ["underlineLinks", "Underline links"],
                    ["highlightLinks", "Highlight links"],
                    ["bigCursor", "Big cursor"],
                    ["readingGuide", "Reading guide"],
                    ["readingMask", "Reading mask"],
                    ["stopAnimations", "Stop animations"],
                    ["hideImages", "Hide images"],
                    ["tooltips", "Extra tooltips"],
                  ]}
                  features={settings.features}
                  onToggle={patchFeature}
                  onPreview={setPreviewTool}
                />
              </Section>
            )}

            {tab === "navigation" && (
              <Section
                title="Keyboard & motor"
                subtitle="Operate the site without a mouse"
              >
                <FeatureGrid
                  items={[
                    ["keyboardNav", "Keyboard navigation"],
                    ["focusRing", "Visible focus ring"],
                    ["skipToContent", "Skip to content"],
                    ["largeClickArea", "Large click areas"],
                    ["voiceNavigation", "Voice navigation (beta)"],
                  ]}
                  features={settings.features}
                  onToggle={patchFeature}
                  onPreview={setPreviewTool}
                />
              </Section>
            )}

            {tab === "statement" && (
              <Section
                title="Accessibility statement"
                subtitle="Public commitment page linked from the widget"
              >
                <Toggle
                  label="Publish statement"
                  description="Show a statement link inside the widget"
                  checked={settings.statement.enabled}
                  onChange={(v) => patchStatement({ enabled: v })}
                />
                <Field label="Organization name">
                  <input
                    className={input}
                    value={settings.statement.companyName}
                    onChange={(e) =>
                      patchStatement({ companyName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Accessibility contact email">
                  <input
                    type="email"
                    className={input}
                    value={settings.statement.contactEmail}
                    onChange={(e) =>
                      patchStatement({ contactEmail: e.target.value })
                    }
                  />
                </Field>
                <Field label="Last reviewed">
                  <input
                    type="date"
                    className={input}
                    value={settings.statement.lastReviewed}
                    onChange={(e) =>
                      patchStatement({ lastReviewed: e.target.value })
                    }
                  />
                </Field>
                <Field label="Custom statement (HTML allowed)">
                  <textarea
                    className={`${input} min-h-[140px] font-mono text-[12px]`}
                    placeholder="We are committed to ensuring digital accessibility for people with disabilities…"
                    value={settings.statement.customHtml}
                    onChange={(e) =>
                      patchStatement({ customHtml: e.target.value })
                    }
                  />
                </Field>
              </Section>
            )}

            {tab === "compliance" && (
              <>
                <Section
                  title="WCAG target"
                  subtitle="Goal level for this website’s remediation work"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {LEVELS.map((level) => (
                      <SelectCard
                        key={level}
                        active={settings.targetLevel === level}
                        label={`WCAG ${level}`}
                        onClick={() => patch({ targetLevel: level })}
                      />
                    ))}
                  </div>
                </Section>
                <Section
                  title="Scanning"
                  subtitle="Schedule checks against common issues"
                >
                  <Toggle
                    label="Automatic weekly scan"
                    description="Queue page checks when the connector is online"
                    checked={settings.autoScan}
                    onChange={(v) => patch({ autoScan: v })}
                  />
                  <div className="mt-3 rounded-xl border border-dashed border-[#e8edf5] bg-[#f8fafc] px-4 py-5 text-center">
                    <p className="text-[14px] font-semibold text-ink">
                      Live audit results
                    </p>
                    <p className="mt-1 text-[12.5px] text-muted">
                      Issue counts and page-level findings appear here after the
                      first scan completes.
                    </p>
                    <button
                      type="button"
                      className="mt-3 rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[12.5px] font-semibold text-ink hover:bg-white"
                      onClick={() =>
                        setError(
                          "Live scanning ships with the connector audit pipeline — settings are saved.",
                        )
                      }
                    >
                      Run scan now
                    </button>
                  </div>
                </Section>
                <Section title="Checklist" subtitle="Manual verification prompts">
                  <CheckItem label="Images have meaningful alt text" />
                  <CheckItem label="Forms expose labels to assistive tech" />
                  <CheckItem label="Color is not the only status cue" />
                  <CheckItem label="Videos include captions where needed" />
                  <CheckItem label="Page title and landmarks are unique" />
                  <CheckItem label="Touch targets are at least 44×44px" />
                </Section>
              </>
            )}
          </div>
        </div>

        <aside className="w-full shrink-0 xl:w-[360px]">
          <div className="sticky top-0 space-y-4 p-4 sm:p-5">
            <div className="rounded-xl border border-[#e8edf5] bg-[#f8fafc] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                  Live preview
                </p>
                <span className="text-[11px] text-faint">
                  {placementLabel(settings.placement)}
                </span>
              </div>
              <WidgetPreview
                settings={settings}
                activeTool={previewTool}
                onTool={setPreviewTool}
                onPlacementChange={setPlacement}
              />
            </div>

            <div className="rounded-xl border border-[#e8edf5] p-4">
              <p className="text-[13px] font-semibold text-ink">Install note</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                Settings save to this website. The Avonix connector loads the
                widget when it is enabled and the plugin is connected.
              </p>
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
  tone = "text-ink",
  hint,
}: {
  value: string;
  label: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] px-3.5 py-3">
      <p className={`text-[20px] font-bold tracking-tight ${tone}`}>
        {value}
        {hint ? (
          <span className="ml-1 text-[12px] font-medium text-faint">{hint}</span>
        ) : null}
      </p>
      <p className="mt-0.5 text-[12px] text-muted">{label}</p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#e8edf5]">
      <div className="border-b border-[#e8edf5] px-4 py-3 sm:px-5">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-transparent px-1 py-2 hover:border-[#e8edf5] hover:bg-[#f8fafc]">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-ink">{label}</p>
        {description ? (
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition ${
          checked ? "bg-brand" : "bg-[#dbe3ee]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-4" : ""
          }`}
        />
      </button>
    </div>
  );
}

function SelectCard({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-2.5 text-[12.5px] font-semibold transition ${
        active
          ? "border-brand/40 bg-brand/5 text-ink"
          : "border-[#e8edf5] bg-white text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function ActionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[12.5px] font-semibold text-ink hover:bg-[#f8fafc]"
    >
      {label}
    </button>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] py-2 last:border-0">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[13px] font-medium capitalize text-ink">{value}</span>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-ink">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function FeatureGrid({
  items,
  features,
  onToggle,
  onPreview,
}: {
  items: [keyof AccessibilitySettings["features"], string][];
  features: AccessibilitySettings["features"];
  onToggle: (
    key: keyof AccessibilitySettings["features"],
    value: boolean,
  ) => void;
  onPreview: (key: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => {
            onToggle(key, !features[key]);
            onPreview(key);
          }}
          className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition ${
            features[key]
              ? "border-brand/30 bg-brand/5"
              : "border-[#e8edf5] bg-white hover:bg-[#f8fafc]"
          }`}
        >
          <span className="text-[12.5px] font-semibold text-ink">{label}</span>
          <span
            className={`text-[10px] font-bold uppercase ${
              features[key] ? "text-ok" : "text-faint"
            }`}
          >
            {features[key] ? "On" : "Off"}
          </span>
        </button>
      ))}
    </div>
  );
}

function CheckItem({ label }: { label: string }) {
  const [done, setDone] = useState(false);
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => setDone(e.target.checked)}
        className="size-4 accent-[var(--color-brand,#ff6600)]"
      />
      <span
        className={`text-[13px] ${done ? "text-muted line-through" : "text-ink"}`}
      >
        {label}
      </span>
    </label>
  );
}

function WidgetPreview({
  settings,
  activeTool,
  onTool,
  onPlacementChange,
}: {
  settings: AccessibilitySettings;
  activeTool: string | null;
  onTool: (id: string | null) => void;
  onPlacementChange: (p: ScreenPlacement) => void;
}) {
  const [open, setOpen] = useState(true);

  const tools = (
    [
      settings.features.fontSize && ["fontSize", "A+", "Larger text"],
      settings.features.highContrast && ["highContrast", "◐", "Contrast"],
      settings.features.grayscale && ["grayscale", "▦", "Grayscale"],
      settings.features.stopAnimations && ["stopAnimations", "⏸", "Pause motion"],
      settings.features.readableFont && ["readableFont", "Aa", "Readable"],
      settings.features.underlineLinks && ["underlineLinks", "⧉", "Links"],
      settings.features.bigCursor && ["bigCursor", "➚", "Big cursor"],
      settings.features.readingGuide && ["readingGuide", "═", "Guide"],
      settings.features.keyboardNav && ["keyboardNav", "⌨", "Keyboard"],
    ] as const
  ).filter(Boolean) as [string, string, string][];

  if (!settings.enabled) {
    return (
      <div className="relative mx-auto flex h-[420px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#dbe3ee] bg-white shadow-sm">
        <p className="px-4 text-center text-[12px] text-muted">
          Enable the widget to preview and drag the Accessibility group
        </p>
      </div>
    );
  }

  return (
    <DraggablePlacementCanvas
      label="Accessibility group"
      placement={settings.placement}
      onChange={onPlacementChange}
    >
      <FloatingLauncherGroup
        placement={settings.placement}
        open={open}
        panel={
          <>
            <FloatingPanelHeader
              title={settings.label}
              onClose={() => setOpen(false)}
            />
            <div className="grid grid-cols-3 gap-1.5 p-2.5">
              {tools.slice(0, 9).map(([id, icon, title]) => (
                <button
                  key={id}
                  type="button"
                  data-no-drag
                  title={title}
                  onClick={() => onTool(activeTool === id ? null : id)}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 ${
                    activeTool === id
                      ? "border-brand/40 bg-brand/5"
                      : "border-[#eef2f7] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span className="text-[13px]">{icon}</span>
                  <span className="truncate text-[8px] font-semibold text-muted">
                    {title.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </>
        }
        launcher={
          <FloatingLauncherButton
            label={settings.label}
            color={settings.primaryColor}
            metrics={{
              iconSize: settings.iconSize,
              buttonPadding: settings.buttonPadding,
            }}
            align={placementHorizontalAlign(settings.placement)}
            onClick={() => setOpen((o) => !o)}
          >
            {settings.iconStyle === "minimal" ? (
              <span className="text-[15px] font-bold leading-none">A</span>
            ) : settings.iconStyle === "modern" ? (
              <WheelchairGlyph className="size-[1em]" />
            ) : (
              <UniversalAccessGlyph className="size-[1em]" />
            )}
          </FloatingLauncherButton>
        }
      />
    </DraggablePlacementCanvas>
  );
}

/** Modern International Symbol of Access (wheelchair). */
function WheelchairGlyph({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="4" r="1" />
      <path d="m18 19 1-7-6 1" />
      <path d="m5 8 3-3 5.5 3-2.36 3.5" />
      <path d="M4.24 14.5a5 5 0 0 0 6.88 6" />
      <path d="M13.76 17.5a5 5 0 0 0-6.88-6" />
    </svg>
  );
}
