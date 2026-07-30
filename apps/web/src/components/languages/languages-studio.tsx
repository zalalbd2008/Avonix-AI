"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { SetupBadge, type SetupBadgeKind } from "@/components/ui/setup-badge";
import { DraggablePlacementCanvas } from "@/components/widgets/draggable-placement-canvas";
import {
  FloatingLauncherButton,
  FloatingLauncherGroup,
  FloatingPanelHeader,
  LAUNCHER_ORANGE,
  LauncherSizeControl,
  TranslateGlyph,
  placementHorizontalAlign,
} from "@/components/widgets/floating-launcher-group";
import { actionSaveLanguages } from "@/lib/languages/actions";
import {
  SITE_LANGUAGE_CATALOG,
  averageCoverage,
  catalogEntry,
  enabledLocales,
  languagesScore,
  localeDisplayName,
  localeFlag,
  makeLocale,
  mergeLanguageSettings,
  type LanguageSettings,
  type LanguageSwitcherStyle,
  type LanguageUrlStrategy,
  type SiteLocale,
  type TranslationEngine,
} from "@/lib/languages/types";
import {
  cornerFromPlacement,
  normalizeScreenPlacement,
  placementLabel,
  type ScreenPlacement,
} from "@/lib/widgets/screen-placement";

type TabId =
  | "overview"
  | "locales"
  | "switcher"
  | "detection"
  | "surfaces"
  | "translation"
  | "urls"
  | "seo"
  | "glossary";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "locales", label: "Locales" },
  { id: "switcher", label: "Switcher" },
  { id: "detection", label: "Detection" },
  { id: "surfaces", label: "Surfaces" },
  { id: "translation", label: "Translation" },
  { id: "urls", label: "URLs" },
  { id: "seo", label: "SEO" },
  { id: "glossary", label: "Glossary" },
];

const STYLES: { id: LanguageSwitcherStyle; label: string }[] = [
  { id: "dropdown", label: "Dropdown" },
  { id: "list", label: "List" },
  { id: "flags", label: "Flags only" },
  { id: "pills", label: "Pills" },
];

const URL_STRATEGIES: { id: LanguageUrlStrategy; label: string; hint: string }[] =
  [
    { id: "subdirectory", label: "Subdirectory", hint: "/bn/…" },
    { id: "subdomain", label: "Subdomain", hint: "bn.site.com" },
    { id: "query", label: "Query param", hint: "?lang=bn" },
    { id: "domain", label: "Domain", hint: "site.bn" },
    { id: "none", label: "No URL change", hint: "Cookie only" },
  ];

const ENGINES: { id: TranslationEngine; label: string }[] = [
  { id: "avonix-ai", label: "Avonix AI" },
  { id: "manual", label: "Manual only" },
  { id: "none", label: "Disabled" },
];

const input =
  "w-full rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

export function LanguagesStudio({
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
  initial?: Partial<LanguageSettings> | null;
}) {
  const [settings, setSettings] = useState(() =>
    mergeLanguageSettings(initial),
  );
  const [tab, setTab] = useState<TabId>("overview");
  const [addCode, setAddCode] = useState("");
  const [previewLocale, setPreviewLocale] = useState(
    () => mergeLanguageSettings(initial).defaultLocale,
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = useMemo(() => languagesScore(settings), [settings]);
  const active = useMemo(() => enabledLocales(settings), [settings]);
  const coverage = useMemo(() => averageCoverage(settings), [settings]);
  const surfacesOn = Object.values(settings.surfaces).filter(Boolean).length;

  const availableToAdd = SITE_LANGUAGE_CATALOG.filter(
    (c) => !settings.locales.some((l) => l.code === c.code),
  );

  function patch(partial: Partial<LanguageSettings>) {
    setSettings((s) => ({ ...s, ...partial }));
  }

  function setSwitcherPlacement(placement: ScreenPlacement) {
    const next = normalizeScreenPlacement(placement);
    setSettings((s) => ({
      ...s,
      switcher: {
        ...s.switcher,
        placement: next,
        position:
          s.switcher.position === "menu-inline"
            ? "menu-inline"
            : cornerFromPlacement(next),
      },
    }));
  }

  function updateLocale(code: string, partial: Partial<SiteLocale>) {
    setSettings((s) => ({
      ...s,
      locales: s.locales.map((l) =>
        l.code === code ? { ...l, ...partial } : l,
      ),
    }));
  }

  function addLocale(code: string) {
    if (!code || settings.locales.some((l) => l.code === code)) return;
    setSettings((s) => ({
      ...s,
      locales: [...s.locales, makeLocale(code)],
    }));
    setAddCode("");
    setPreviewLocale(code);
  }

  function removeLocale(code: string) {
    if (code === settings.defaultLocale) {
      setError("Change the default language before removing it.");
      return;
    }
    setSettings((s) => ({
      ...s,
      locales: s.locales.filter((l) => l.code !== code),
      fallbackLocale:
        s.fallbackLocale === code ? s.defaultLocale : s.fallbackLocale,
    }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await actionSaveLanguages({
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
  const host = websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <div className="-mx-6 -my-[26px] flex min-h-[calc(100vh-50px)] flex-col bg-white">
      <header className="shrink-0 border-b border-[#e8edf5] px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid size-10 place-items-center rounded-xl bg-[#f1f5f9] text-brand">
              <TranslateGlyph className="size-5" />
            </span>
            <div>
              <p className="text-[12px] text-muted">Website workspace</p>
              <h1 className="text-[22px] font-bold tracking-tight text-ink">
                Languages
              </h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
                Locales, switcher, and translation for {websiteName}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {saved ? (
              <span className="text-[12px] font-semibold text-ok">Saved</span>
            ) : null}
            {error ? (
              <span className="max-w-[240px] text-[12px] font-medium text-bad">
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
              {settings.enabled ? "Multilingual on" : "Off"}
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
          <Metric
            value={`${score}`}
            label="Readiness score"
            tone={scoreTone}
            hint="/ 100"
            badge={!settings.enabled ? "setup" : undefined}
          />
          <Metric
            value={String(active.length)}
            label="Active locales"
            badge={!settings.enabled ? "setup" : undefined}
          />
          <Metric
            value={`${coverage}%`}
            label="Avg. coverage"
            badge={!settings.enabled ? "setup" : undefined}
          />
          <Metric
            value={`${surfacesOn}/7`}
            label="Surfaces"
            badge={
              !settings.enabled
                ? "setup"
                : surfacesOn < 7
                  ? "incomplete"
                  : undefined
            }
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
                <b className="font-semibold text-ink">Multilingual is on.</b>{" "}
                <span className="text-muted">
                  Default {localeDisplayName(settings.defaultLocale)} ·{" "}
                  {settings.urlStrategy} URLs · {settings.engine} · {host}
                </span>
              </>
            ) : (
              <>
                <b className="font-semibold text-ink">Multilingual is off.</b>{" "}
                <span className="text-muted">
                  Add locales, configure the switcher, then enable and save.
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
                  subtitle="Common multilingual setups"
                >
                  <div className="flex flex-wrap gap-2">
                    <ActionChip
                      label={settings.enabled ? "Disable" : "Enable multilingual"}
                      onClick={() => patch({ enabled: !settings.enabled })}
                    />
                    <ActionChip
                      label="EN + BN starter"
                      onClick={() =>
                        setSettings((s) =>
                          mergeLanguageSettings({
                            ...s,
                            enabled: true,
                            defaultLocale: "en",
                            fallbackLocale: "en",
                            locales: [
                              makeLocale("en", { coverage: 100 }),
                              makeLocale("bn", { coverage: 40 }),
                            ],
                            engine: "avonix-ai",
                            urlStrategy: "subdirectory",
                          }),
                        )
                      }
                    />
                    <ActionChip
                      label="Enable all surfaces"
                      onClick={() =>
                        patch({
                          surfaces: {
                            forms: true,
                            chat: true,
                            popups: true,
                            buttons: true,
                            emails: true,
                            knowledge: true,
                            accessibilityWidget: true,
                          },
                        })
                      }
                    />
                    <ActionChip
                      label="SEO-ready preset"
                      onClick={() =>
                        patch({
                          urlStrategy: "subdirectory",
                          seo: {
                            hreflang: true,
                            translateTitles: true,
                            translateMeta: true,
                            translateOpenGraph: true,
                            xDefault: true,
                          },
                          detection: {
                            ...settings.detection,
                            browser: true,
                            rememberChoice: true,
                          },
                        })
                      }
                    />
                  </div>
                </Section>

                <Section title="At a glance">
                  <InfoLine
                    label="Default"
                    value={`${localeFlag(settings.defaultLocale)} ${localeDisplayName(settings.defaultLocale)}`}
                  />
                  <InfoLine
                    label="Fallback"
                    value={localeDisplayName(settings.fallbackLocale)}
                  />
                  <InfoLine label="URL strategy" value={settings.urlStrategy} />
                  <InfoLine label="Engine" value={settings.engine} />
                  <InfoLine
                    label="Switcher"
                    value={
                      settings.switcher.enabled
                        ? `${settings.switcher.style} · ${settings.switcher.position}`
                        : "Hidden"
                    }
                  />
                  <InfoLine
                    label="RTL locales"
                    value={String(active.filter((l) => l.rtl).length)}
                  />
                </Section>

                <Section
                  title="Coverage by locale"
                  subtitle="Estimate of translated Avonix surfaces"
                >
                  {active.length === 0 ? (
                    <p className="text-[13px] text-muted">
                      Enable at least one locale on the Locales tab.
                    </p>
                  ) : (
                    active.map((l) => (
                      <ScoreBar
                        key={l.code}
                        label={`${localeFlag(l.code)} ${localeDisplayName(l.code)}`}
                        value={l.coverage}
                        max={100}
                      />
                    ))
                  )}
                </Section>
              </>
            )}

            {tab === "locales" && (
              <>
                <Section
                  title="Default & fallback"
                  subtitle="Source language and missing-string fallback"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Default (source)">
                      <select
                        className={input}
                        value={settings.defaultLocale}
                        onChange={(e) => {
                          const code = e.target.value;
                          patch({ defaultLocale: code });
                          updateLocale(code, { enabled: true, coverage: 100 });
                        }}
                      >
                        {settings.locales.map((l) => (
                          <option key={l.code} value={l.code}>
                            {localeFlag(l.code)} {localeDisplayName(l.code)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fallback">
                      <select
                        className={input}
                        value={settings.fallbackLocale}
                        onChange={(e) =>
                          patch({ fallbackLocale: e.target.value })
                        }
                      >
                        {settings.locales.map((l) => (
                          <option key={l.code} value={l.code}>
                            {localeFlag(l.code)} {localeDisplayName(l.code)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </Section>

                <Section
                  title="Installed locales"
                  subtitle="Toggle visibility, RTL, and coverage"
                >
                  <div className="space-y-2">
                    {settings.locales.map((l) => {
                      const cat = catalogEntry(l.code);
                      const isDefault = l.code === settings.defaultLocale;
                      return (
                        <div
                          key={l.code}
                          className="rounded-xl border border-[#e8edf5] px-3 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[18px]">
                              {localeFlag(l.code)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-ink">
                                {cat?.name ?? l.code}{" "}
                                <span className="font-normal text-muted">
                                  {cat?.native}
                                </span>
                              </p>
                              <p className="text-[11px] text-faint">
                                {l.code}
                                {isDefault ? " · default" : ""}
                                {l.rtl ? " · RTL" : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewLocale(l.code)}
                              className="rounded-lg border border-[#e8edf5] px-2 py-1 text-[11px] font-semibold text-muted hover:text-ink"
                            >
                              Preview
                            </button>
                            {!isDefault ? (
                              <button
                                type="button"
                                onClick={() => removeLocale(l.code)}
                                className="rounded-lg px-2 py-1 text-[11px] font-semibold text-bad hover:bg-bad/5"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <MiniToggle
                              label="Enabled"
                              checked={l.enabled}
                              onChange={(v) =>
                                updateLocale(l.code, { enabled: v })
                              }
                            />
                            <MiniToggle
                              label="In switcher"
                              checked={l.visible}
                              onChange={(v) =>
                                updateLocale(l.code, { visible: v })
                              }
                            />
                            <MiniToggle
                              label="RTL"
                              checked={l.rtl}
                              onChange={(v) =>
                                updateLocale(l.code, { rtl: v })
                              }
                            />
                          </div>
                          <div className="mt-3">
                            <Field label={`Coverage · ${l.coverage}%`}>
                              <input
                                type="range"
                                min={0}
                                max={100}
                                value={l.coverage}
                                onChange={(e) =>
                                  updateLocale(l.code, {
                                    coverage: Number(e.target.value),
                                  })
                                }
                                className="w-full accent-[var(--color-brand,#ff6600)]"
                              />
                            </Field>
                          </div>
                          <div className="mt-2">
                            <Field label="Custom label (optional)">
                              <input
                                className={input}
                                placeholder={cat?.native ?? l.code}
                                value={l.label}
                                onChange={(e) =>
                                  updateLocale(l.code, {
                                    label: e.target.value,
                                  })
                                }
                              />
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {availableToAdd.length ? (
                    <div className="mt-4 flex flex-wrap items-end gap-2">
                      <div className="min-w-[200px] flex-1">
                        <Field label="Add language">
                          <select
                            className={input}
                            value={addCode}
                            onChange={(e) => setAddCode(e.target.value)}
                          >
                            <option value="">Select a language…</option>
                            {availableToAdd.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.name} ({c.native})
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <button
                        type="button"
                        disabled={!addCode}
                        onClick={() => addLocale(addCode)}
                        className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-[12.5px] text-muted">
                      All catalog languages are installed.
                    </p>
                  )}
                </Section>
              </>
            )}

            {tab === "switcher" && (
              <Section
                title="Language switcher"
                subtitle="How visitors change language on the site"
              >
                <Toggle
                  label="Show language switcher"
                  description="Floating or menu control for visitors"
                  checked={settings.switcher.enabled}
                  onChange={(v) =>
                    patch({ switcher: { ...settings.switcher, enabled: v } })
                  }
                />
                <Field label="Style">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {STYLES.map((s) => (
                      <SelectCard
                        key={s.id}
                        active={settings.switcher.style === s.id}
                        label={s.label}
                        onClick={() =>
                          patch({
                            switcher: { ...settings.switcher, style: s.id },
                          })
                        }
                      />
                    ))}
                  </div>
                </Field>
                <Field label="Button size">
                  <LauncherSizeControl
                    value={{
                      iconSize: settings.switcher.iconSize,
                      buttonPadding: settings.switcher.buttonPadding,
                    }}
                    onChange={({ iconSize, buttonPadding }) =>
                      patch({
                        switcher: {
                          ...settings.switcher,
                          iconSize,
                          buttonPadding,
                        },
                      })
                    }
                  />
                </Field>
                <Field label="Placement">
                  <p className="mb-2 text-[12px] text-muted">
                    Move the Languages group in the live preview with your
                    cursor — no numbers to enter. Independent from Accessibility
                    and Live Chat.
                  </p>
                  <Toggle
                    label="Place in site menu (inline)"
                    description="Skip floating placement — inject into the theme menu instead"
                    checked={settings.switcher.position === "menu-inline"}
                    onChange={(v) =>
                      patch({
                        switcher: {
                          ...settings.switcher,
                          position: v
                            ? "menu-inline"
                            : cornerFromPlacement(settings.switcher.placement),
                        },
                      })
                    }
                  />
                  {settings.switcher.position === "menu-inline" ? (
                    <p className="mt-2 text-[12px] text-faint">
                      Floating drag is disabled while menu-inline is on.
                    </p>
                  ) : null}
                </Field>
                <Toggle
                  label="Show flags"
                  checked={settings.switcher.showFlags}
                  onChange={(v) =>
                    patch({
                      switcher: { ...settings.switcher, showFlags: v },
                    })
                  }
                />
                <Toggle
                  label="Show native names"
                  checked={settings.switcher.showNativeNames}
                  onChange={(v) =>
                    patch({
                      switcher: {
                        ...settings.switcher,
                        showNativeNames: v,
                      },
                    })
                  }
                />
                <Toggle
                  label="Show language codes"
                  checked={settings.switcher.showCodes}
                  onChange={(v) =>
                    patch({
                      switcher: { ...settings.switcher, showCodes: v },
                    })
                  }
                />
              </Section>
            )}

            {tab === "detection" && (
              <Section
                title="Language detection"
                subtitle="Choose the first language for new visitors"
              >
                <Toggle
                  label="Detect browser language"
                  description="Use Accept-Language when available"
                  checked={settings.detection.browser}
                  onChange={(v) =>
                    patch({
                      detection: { ...settings.detection, browser: v },
                    })
                  }
                />
                <Toggle
                  label="Geo-IP suggestion"
                  description="Suggest from visitor country (approximate)"
                  checked={settings.detection.geoIp}
                  onChange={(v) =>
                    patch({
                      detection: { ...settings.detection, geoIp: v },
                    })
                  }
                />
                <Toggle
                  label="Remember visitor choice"
                  description="Persist selection in a cookie / local storage"
                  checked={settings.detection.rememberChoice}
                  onChange={(v) =>
                    patch({
                      detection: {
                        ...settings.detection,
                        rememberChoice: v,
                      },
                    })
                  }
                />
                <Toggle
                  label="Prompt on first visit"
                  description="Ask visitors to confirm language once"
                  checked={settings.detection.promptOnFirstVisit}
                  onChange={(v) =>
                    patch({
                      detection: {
                        ...settings.detection,
                        promptOnFirstVisit: v,
                      },
                    })
                  }
                />
              </Section>
            )}

            {tab === "surfaces" && (
              <Section
                title="What to translate"
                subtitle="Avonix surfaces on this website"
              >
                <Toggle
                  label="Forms"
                  description="Labels, placeholders, messages"
                  checked={settings.surfaces.forms}
                  onChange={(v) =>
                    patch({
                      surfaces: { ...settings.surfaces, forms: v },
                    })
                  }
                />
                <Toggle
                  label="Live Chat"
                  description="Greeting, quick replies, system copy"
                  checked={settings.surfaces.chat}
                  onChange={(v) =>
                    patch({
                      surfaces: { ...settings.surfaces, chat: v },
                    })
                  }
                />
                <Toggle
                  label="Popups"
                  checked={settings.surfaces.popups}
                  onChange={(v) =>
                    patch({
                      surfaces: { ...settings.surfaces, popups: v },
                    })
                  }
                />
                <Toggle
                  label="CTA buttons"
                  checked={settings.surfaces.buttons}
                  onChange={(v) =>
                    patch({
                      surfaces: { ...settings.surfaces, buttons: v },
                    })
                  }
                />
                <Toggle
                  label="Knowledge base answers"
                  description="Prefer locale-matched passages when available"
                  checked={settings.surfaces.knowledge}
                  onChange={(v) =>
                    patch({
                      surfaces: { ...settings.surfaces, knowledge: v },
                    })
                  }
                />
                <Toggle
                  label="Transactional emails"
                  checked={settings.surfaces.emails}
                  onChange={(v) =>
                    patch({
                      surfaces: { ...settings.surfaces, emails: v },
                    })
                  }
                />
                <Toggle
                  label="Accessibility widget"
                  checked={settings.surfaces.accessibilityWidget}
                  onChange={(v) =>
                    patch({
                      surfaces: {
                        ...settings.surfaces,
                        accessibilityWidget: v,
                      },
                    })
                  }
                />
              </Section>
            )}

            {tab === "translation" && (
              <Section
                title="Translation engine"
                subtitle="How new copy gets translated"
              >
                <Field label="Engine">
                  <div className="grid grid-cols-3 gap-2">
                    {ENGINES.map((e) => (
                      <SelectCard
                        key={e.id}
                        active={settings.engine === e.id}
                        label={e.label}
                        onClick={() => patch({ engine: e.id })}
                      />
                    ))}
                  </div>
                </Field>
                <Toggle
                  label="Auto-translate new strings"
                  description="When Avonix AI is selected, translate additions automatically"
                  checked={settings.autoTranslateNew}
                  onChange={(v) => patch({ autoTranslateNew: v })}
                />
                <div className="rounded-xl border border-dashed border-[#e8edf5] bg-[#f8fafc] px-4 py-5 text-center">
                  <p className="text-[14px] font-semibold text-ink">
                    Translation jobs
                  </p>
                  <p className="mt-1 text-[12.5px] text-muted">
                    Queue status and string editors appear here after the first
                    sync with the connector.
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-[12.5px] font-semibold text-ink"
                    onClick={() =>
                      setError(
                        "Live translation queue ships with the connector sync — settings are saved.",
                      )
                    }
                  >
                    Sync translations
                  </button>
                </div>
              </Section>
            )}

            {tab === "urls" && (
              <Section
                title="URL strategy"
                subtitle="How language appears in addresses"
              >
                <div className="grid gap-2">
                  {URL_STRATEGIES.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => patch({ urlStrategy: u.id })}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        settings.urlStrategy === u.id
                          ? "border-brand/40 bg-brand/5"
                          : "border-[#e8edf5] hover:bg-[#f8fafc]"
                      }`}
                    >
                      <span>
                        <span className="block text-[13px] font-semibold text-ink">
                          {u.label}
                        </span>
                        <span className="text-[12px] text-muted">{u.hint}</span>
                      </span>
                      <span className="font-mono text-[11px] text-faint">
                        {u.id === "subdirectory"
                          ? `/${previewLocale}/…`
                          : u.id === "subdomain"
                            ? `${previewLocale}.${host}`
                            : u.id === "query"
                              ? `?lang=${previewLocale}`
                              : u.id === "domain"
                                ? host.replace(/\.[^.]+$/, `.${previewLocale}`)
                                : host}
                      </span>
                    </button>
                  ))}
                </div>
                <Field label="Exclude URL paths (one per line)">
                  <textarea
                    className={`${input} min-h-[88px] font-mono text-[12px]`}
                    placeholder={"/wp-admin\n/cart"}
                    value={settings.excludePaths}
                    onChange={(e) => patch({ excludePaths: e.target.value })}
                  />
                </Field>
                <Field label="Exclude CSS selectors (one per line)">
                  <textarea
                    className={`${input} min-h-[88px] font-mono text-[12px]`}
                    value={settings.excludeSelectors}
                    onChange={(e) =>
                      patch({ excludeSelectors: e.target.value })
                    }
                  />
                </Field>
              </Section>
            )}

            {tab === "seo" && (
              <Section
                title="SEO & hreflang"
                subtitle="Help search engines understand language versions"
              >
                <Toggle
                  label="Emit hreflang tags"
                  checked={settings.seo.hreflang}
                  onChange={(v) =>
                    patch({ seo: { ...settings.seo, hreflang: v } })
                  }
                />
                <Toggle
                  label="x-default hreflang"
                  description="Point unmatched locales to the default language"
                  checked={settings.seo.xDefault}
                  onChange={(v) =>
                    patch({ seo: { ...settings.seo, xDefault: v } })
                  }
                />
                <Toggle
                  label="Translate page titles"
                  checked={settings.seo.translateTitles}
                  onChange={(v) =>
                    patch({ seo: { ...settings.seo, translateTitles: v } })
                  }
                />
                <Toggle
                  label="Translate meta descriptions"
                  checked={settings.seo.translateMeta}
                  onChange={(v) =>
                    patch({ seo: { ...settings.seo, translateMeta: v } })
                  }
                />
                <Toggle
                  label="Translate Open Graph tags"
                  checked={settings.seo.translateOpenGraph}
                  onChange={(v) =>
                    patch({
                      seo: { ...settings.seo, translateOpenGraph: v },
                    })
                  }
                />
              </Section>
            )}

            {tab === "glossary" && (
              <>
                <Section
                  title="Glossary"
                  subtitle="Preferred translations for brand and product terms"
                >
                  <Field label="Terms (term = translation, one per line)">
                    <textarea
                      className={`${input} min-h-[140px] font-mono text-[12px]`}
                      placeholder={"Lead = লিড\nAgency = এজেন্সি"}
                      value={settings.glossary}
                      onChange={(e) => patch({ glossary: e.target.value })}
                    />
                  </Field>
                </Section>
                <Section
                  title="Do not translate"
                  subtitle="Keep these strings in the source language"
                >
                  <Field label="Never-translate list (one per line)">
                    <textarea
                      className={`${input} min-h-[120px] font-mono text-[12px]`}
                      value={settings.neverTranslate}
                      onChange={(e) =>
                        patch({ neverTranslate: e.target.value })
                      }
                    />
                  </Field>
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
                  {settings.switcher.position === "menu-inline"
                    ? "menu-inline"
                    : placementLabel(settings.switcher.placement)}
                </span>
              </div>
              <SwitcherPreview
                settings={settings}
                previewLocale={previewLocale}
                onSelect={setPreviewLocale}
                host={host}
                onPlacementChange={setSwitcherPlacement}
              />
            </div>
            <div className="rounded-xl border border-[#e8edf5] p-4">
              <p className="text-[13px] font-semibold text-ink">Install note</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
                Settings save to this website. With connector{" "}
                <span className="font-semibold text-ink">v1.3.11+</span>{" "}
                installed, the orange A文 switcher appears on the live site when
                multilingual is on and at least one locale is visible. Visitors
                can translate the page from the switcher.
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
  badge,
}: {
  value: string;
  label: string;
  tone?: string;
  hint?: string;
  badge?: SetupBadgeKind;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf5] px-3.5 py-3">
      <p className={`text-[20px] font-bold tracking-tight ${badge ? "text-bad" : tone}`}>
        {badge ? (
          <SetupBadge kind={badge} size="lg" />
        ) : (
          <>
            {value}
            {hint ? (
              <span className="ml-1 text-[12px] font-medium text-faint">{hint}</span>
            ) : null}
          </>
        )}
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

function MiniToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-lg border px-2.5 py-2 text-left text-[11.5px] font-semibold ${
        checked
          ? "border-brand/30 bg-brand/5 text-ink"
          : "border-[#e8edf5] text-muted"
      }`}
    >
      {label}: {checked ? "On" : "Off"}
    </button>
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
      <span className="text-right text-[13px] font-medium capitalize text-ink">
        {value}
      </span>
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

function SwitcherPreview({
  settings,
  previewLocale,
  onSelect,
  host,
  onPlacementChange,
}: {
  settings: LanguageSettings;
  previewLocale: string;
  onSelect: (code: string) => void;
  host: string;
  onPlacementChange: (p: ScreenPlacement) => void;
}) {
  const [open, setOpen] = useState(true);
  const visible = settings.locales.filter((l) => l.enabled && l.visible);
  const floating = settings.switcher.position !== "menu-inline";

  const localeRows = (
    <div className="max-h-[180px] overflow-y-auto py-1">
      {visible.map((l) => (
        <button
          key={l.code}
          type="button"
          data-no-drag
          onClick={() => onSelect(l.code)}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] ${
            previewLocale === l.code
              ? "bg-brand/5 font-semibold text-ink"
              : "text-muted hover:bg-[#f8fafc]"
          }`}
        >
          {settings.switcher.showFlags ? (
            <span className="text-[14px]">{localeFlag(l.code)}</span>
          ) : null}
          <span className="min-w-0 truncate">
            {settings.switcher.showNativeNames
              ? (catalogEntry(l.code)?.native ?? localeDisplayName(l.code))
              : localeDisplayName(l.code)}
            {settings.switcher.showCodes ? ` (${l.code})` : ""}
          </span>
        </button>
      ))}
    </div>
  );

  if (!(settings.enabled && settings.switcher.enabled)) {
    return (
      <div className="relative mx-auto flex h-[420px] w-full max-w-[300px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#dbe3ee] bg-white shadow-sm">
        <p className="px-4 text-center text-[12px] text-muted">
          {settings.enabled
            ? "Switcher is hidden"
            : "Enable multilingual to preview"}
        </p>
      </div>
    );
  }

  if (!floating) {
    return (
      <div className="relative mx-auto h-[420px] w-full max-w-[300px] overflow-hidden rounded-2xl border border-[#dbe3ee] bg-white shadow-sm">
        <div className="p-4">
          <p className="text-[12px] text-muted">
            Menu-inline mode — floating icon + tooltip is off. Sample host:{" "}
            <span className="font-mono text-[11px]">{host}</span>
          </p>
          <div className="mt-3 rounded-xl border border-[#e8edf5] bg-white shadow-sm">
            {localeRows}
          </div>
        </div>
      </div>
    );
  }

  return (
    <DraggablePlacementCanvas
      label="Languages group"
      placement={settings.switcher.placement}
      onChange={onPlacementChange}
    >
      <FloatingLauncherGroup
        placement={settings.switcher.placement}
        open={open}
        panel={
          <>
            <FloatingPanelHeader
              title="Language"
              onClose={() => setOpen(false)}
            />
            {localeRows}
          </>
        }
        launcher={
          <FloatingLauncherButton
            label="Language"
            color={LAUNCHER_ORANGE}
            metrics={{
              iconSize: settings.switcher.iconSize,
              buttonPadding: settings.switcher.buttonPadding,
            }}
            align={placementHorizontalAlign(settings.switcher.placement)}
            onClick={() => setOpen((o) => !o)}
          >
            <TranslateGlyph className="size-[1em]" />
          </FloatingLauncherButton>
        }
      />
    </DraggablePlacementCanvas>
  );
}
