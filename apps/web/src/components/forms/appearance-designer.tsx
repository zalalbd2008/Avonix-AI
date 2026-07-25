"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CUSTOM_CSS_SNIPPETS,
  DEFAULT_THEME,
  THEME_PRESETS,
  applyPreset,
  mergeTheme,
  type ConditionalStyleRule,
  type FormTheme,
} from "@/lib/forms/theme";
import {
  MARKETPLACE_PACKS,
  applyBrandKit,
  applyMarketplacePack,
  deleteThemeFromLibrary,
  duplicateThemeInLibrary,
  listSavedThemes,
  loadThemeFromLibrary,
  saveThemeToLibrary,
  type SavedTheme,
} from "@/lib/forms/theme-library";
import { GoogleFontPicker } from "@/components/fonts/google-font-picker";
import {
  googleFontStack,
  googleFontsCssUrl,
  parseStoredFontFamily,
} from "@/lib/fonts/google";

type Props = {
  theme: FormTheme;
  onChange: (theme: FormTheme) => void;
};

type SectionId =
  | "presets"
  | "marketplace"
  | "tokens"
  | "brand"
  | "layout"
  | "container"
  | "typography"
  | "labels"
  | "placeholder"
  | "input"
  | "buttons"
  | "icons"
  | "fileUpload"
  | "checkbox"
  | "radio"
  | "toggle"
  | "dropdown"
  | "datePicker"
  | "range"
  | "rating"
  | "signature"
  | "recaptcha"
  | "progress"
  | "section"
  | "validation"
  | "messages"
  | "animation"
  | "responsive"
  | "conditional"
  | "advanced"
  | "dark"
  | "a11y"
  | "library"
  | "import";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "presets", label: "Theme Presets" },
  { id: "marketplace", label: "Style Marketplace" },
  { id: "tokens", label: "Design Tokens" },
  { id: "brand", label: "Brand Kit" },
  { id: "layout", label: "Layout" },
  { id: "container", label: "Container" },
  { id: "typography", label: "Typography" },
  { id: "labels", label: "Labels" },
  { id: "placeholder", label: "Placeholder" },
  { id: "input", label: "Input Fields" },
  { id: "buttons", label: "Buttons" },
  { id: "icons", label: "Icons" },
  { id: "fileUpload", label: "File Upload" },
  { id: "checkbox", label: "Checkbox" },
  { id: "radio", label: "Radio Button" },
  { id: "toggle", label: "Toggle Switch" },
  { id: "dropdown", label: "Dropdown" },
  { id: "datePicker", label: "Date Picker" },
  { id: "range", label: "Range Slider" },
  { id: "rating", label: "Rating" },
  { id: "signature", label: "Signature" },
  { id: "recaptcha", label: "reCAPTCHA" },
  { id: "progress", label: "Progress Bar" },
  { id: "section", label: "Section Break" },
  { id: "validation", label: "Validation" },
  { id: "messages", label: "Messages" },
  { id: "animation", label: "Animation" },
  { id: "responsive", label: "Responsive" },
  { id: "conditional", label: "Conditional Styling" },
  { id: "advanced", label: "Advanced CSS" },
  { id: "dark", label: "Dark Mode & RTL" },
  { id: "a11y", label: "Accessibility" },
  { id: "library", label: "Global Style Manager" },
  { id: "import", label: "Import / Export" },
];

/**
 * Enterprise Visual Form Design System panel — presets, tokens, and
 * component-level styling with state controls.
 */
export function AppearanceDesigner({ theme, onChange }: Props) {
  const [open, setOpen] = useState<SectionId | null>("presets");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [history, setHistory] = useState<FormTheme[]>([structuredClone(theme)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [saved, setSaved] = useState<SavedTheme[]>([]);
  const [libraryName, setLibraryName] = useState("");
  const [skipHistory, setSkipHistory] = useState(false);

  useEffect(() => {
    setSaved(listSavedThemes());
  }, []);

  // Load Google Fonts CDN for live form-field preview (not self-hosted).
  useEffect(() => {
    const url = googleFontsCssUrl([
      theme.typography.fontFamily,
      theme.brandKit.primaryFont,
    ]);
    const id = "avonix-form-gfont-preview";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!url) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [theme.typography.fontFamily, theme.brandKit.primaryFont]);

  const commit = (next: FormTheme) => {
    onChange(next);
    if (skipHistory) return;
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      const updated = [...trimmed, structuredClone(next)].slice(-40);
      setHistoryIndex(updated.length - 1);
      return updated;
    });
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setSkipHistory(true);
    onChange(structuredClone(history[i]));
    queueMicrotask(() => setSkipHistory(false));
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setSkipHistory(true);
    onChange(structuredClone(history[i]));
    queueMicrotask(() => setSkipHistory(false));
  };

  const patch = <K extends keyof FormTheme>(key: K, value: FormTheme[K]) => {
    commit({
      ...theme,
      [key]: value,
      presetId: key === "presetId" ? (value as string) : "custom",
    });
  };

  const patchDeep = <K extends keyof FormTheme>(
    key: K,
    partial: Partial<FormTheme[K]>,
  ) => {
    commit({
      ...theme,
      presetId: "custom",
      [key]: { ...(theme[key] as object), ...partial },
    });
  };

  const exportJson = useMemo(() => JSON.stringify(theme, null, 2), [theme]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
          Visual Designer
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Full form design system — presets, tokens, and component styles. Preview to see live.
        </p>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={historyIndex <= 0}
            className="flex-1 rounded-md border border-[#dbe1ea] py-1.5 text-[11.5px] font-semibold text-muted disabled:opacity-35"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="flex-1 rounded-md border border-[#dbe1ea] py-1.5 text-[11.5px] font-semibold text-muted disabled:opacity-35"
          >
            Redo
          </button>
        </div>
      </div>

      {SECTIONS.map((s) => {
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="overflow-hidden rounded-lg border border-[#e6e9f0]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center justify-between bg-[#f8fafc] px-2.5 py-2 text-left text-[12.5px] font-semibold text-[#13233c] hover:bg-[#f1f4f8]"
            >
              {s.label}
              <span className="text-[10px] text-faint">{isOpen ? "▾" : "▸"}</span>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-[#e6e9f0] bg-white p-2.5">
                {s.id === "presets" && (
                  <PresetGrid
                    active={theme.presetId}
                    onPick={(id) => commit(applyPreset(id))}
                  />
                )}

                {s.id === "marketplace" && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {MARKETPLACE_PACKS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => commit(applyMarketplacePack(p.id))}
                        className={`rounded-lg border px-2.5 py-2 text-left ${
                          theme.presetId === p.id
                            ? "border-brand bg-[rgba(255,102,0,.06)]"
                            : "border-[#e6e9f0] hover:border-brand/50"
                        }`}
                      >
                        <span className="block text-[12px] font-semibold">{p.label}</span>
                        <span className="block text-[10.5px] text-faint">{p.hint}</span>
                      </button>
                    ))}
                  </div>
                )}

                {s.id === "brand" && (
                  <>
                    <TextRow
                      label="Brand name"
                      value={theme.brandKit.brandName}
                      onChange={(v) => patchDeep("brandKit", { brandName: v })}
                    />
                    <TextRow
                      label="Logo URL"
                      value={theme.brandKit.logoUrl}
                      onChange={(v) => patchDeep("brandKit", { logoUrl: v })}
                      placeholder="https://…"
                    />
                    <GoogleFontPicker
                      label="Primary font"
                      value={parseStoredFontFamily(theme.brandKit.primaryFont)}
                      onChange={(family) =>
                        patchDeep("brandKit", {
                          primaryFont:
                            family === "system"
                              ? "system-ui, -apple-system, Segoe UI, sans-serif"
                              : googleFontStack(family),
                        })
                      }
                    />
                    {[0, 1, 2, 3].map((i) => (
                      <ColorRow
                        key={i}
                        label={["Primary", "Secondary", "Accent", "Text"][i]}
                        value={theme.brandKit.colors[i] ?? "#ff6600"}
                        onChange={(v) => {
                          const colors = [...theme.brandKit.colors];
                          colors[i] = v;
                          patchDeep("brandKit", { colors });
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => commit(applyBrandKit(theme))}
                      className="rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Apply brand kit to form
                    </button>
                  </>
                )}

                {s.id === "tokens" && (
                  <>
                    <ColorRow
                      label="Primary"
                      value={theme.tokens.primary}
                      onChange={(v) => {
                        const tokens = { ...theme.tokens, primary: v };
                        commit({
                          ...theme,
                          presetId: "custom",
                          tokens,
                          buttons: {
                            ...theme.buttons,
                            submit: { ...theme.buttons.submit, background: v, borderColor: v },
                            next: { ...theme.buttons.next, background: v, borderColor: v },
                          },
                          labels: { ...theme.labels, requiredColor: v },
                          progress: {
                            ...theme.progress,
                            activeColor: v,
                            completedColor: v,
                          },
                          input: {
                            ...theme.input,
                            states: {
                              ...theme.input.states,
                              focus: {
                                ...theme.input.states.focus,
                                borderColor: v,
                              },
                            },
                          },
                        });
                      }}
                    />
                    <ColorRow
                      label="Secondary"
                      value={theme.tokens.secondary}
                      onChange={(v) => patchDeep("tokens", { secondary: v })}
                    />
                    <ColorRow
                      label="Accent"
                      value={theme.tokens.accent}
                      onChange={(v) => patchDeep("tokens", { accent: v })}
                    />
                    <ColorRow
                      label="Surface"
                      value={theme.tokens.surface}
                      onChange={(v) =>
                        commit({
                          ...theme,
                          presetId: "custom",
                          tokens: { ...theme.tokens, surface: v },
                          container: { ...theme.container, backgroundColor: v },
                        })
                      }
                    />
                    <ColorRow
                      label="Text"
                      value={theme.tokens.text}
                      onChange={(v) =>
                        commit({
                          ...theme,
                          presetId: "custom",
                          tokens: { ...theme.tokens, text: v },
                          typography: { ...theme.typography, color: v },
                          labels: { ...theme.labels, color: v },
                        })
                      }
                    />
                    <ColorRow
                      label="Border"
                      value={theme.tokens.border}
                      onChange={(v) =>
                        commit({
                          ...theme,
                          presetId: "custom",
                          tokens: { ...theme.tokens, border: v },
                          input: { ...theme.input, borderColor: v },
                        })
                      }
                    />
                    <RangeRow
                      label="Radius scale"
                      value={theme.tokens.radius}
                      min={0}
                      max={24}
                      onChange={(v) =>
                        commit({
                          ...theme,
                          presetId: "custom",
                          tokens: { ...theme.tokens, radius: v },
                          input: { ...theme.input, borderRadius: v },
                          container: { ...theme.container, borderRadius: Math.max(v, 4) },
                          buttons: {
                            submit: { ...theme.buttons.submit, borderRadius: v },
                            next: { ...theme.buttons.next, borderRadius: v },
                            previous: { ...theme.buttons.previous, borderRadius: v },
                            reset: { ...theme.buttons.reset, borderRadius: v },
                            saveDraft: { ...theme.buttons.saveDraft, borderRadius: v },
                          },
                        })
                      }
                    />
                    <SelectRow
                      label="Shadow level"
                      value={theme.tokens.shadow}
                      options={[
                        ["none", "None"],
                        ["sm", "Small"],
                        ["md", "Medium"],
                        ["lg", "Large"],
                        ["xl", "XL"],
                      ]}
                      onChange={(v) =>
                        patchDeep("tokens", {
                          shadow: v as FormTheme["tokens"]["shadow"],
                        })
                      }
                    />
                    <RangeRow
                      label="Spacing scale"
                      value={theme.tokens.spacing}
                      min={4}
                      max={32}
                      onChange={(v) => patchDeep("tokens", { spacing: v })}
                    />
                  </>
                )}

                {s.id === "layout" && (
                  <>
                    <SelectRow
                      label="Form width"
                      value={theme.layout.width}
                      options={[
                        ["auto", "Auto"],
                        ["sm", "Small"],
                        ["md", "Medium"],
                        ["lg", "Large"],
                        ["full", "Full width"],
                        ["custom", "Custom"],
                      ]}
                      onChange={(v) =>
                        patchDeep("layout", {
                          width: v as FormTheme["layout"]["width"],
                        })
                      }
                    />
                    {theme.layout.width === "custom" && (
                      <RangeRow
                        label="Custom width"
                        value={theme.layout.customWidth}
                        min={280}
                        max={960}
                        onChange={(v) => patchDeep("layout", { customWidth: v })}
                      />
                    )}
                    <SelectRow
                      label="Columns (density)"
                      value={String(theme.layout.columns)}
                      options={[
                        ["1", "1 column"],
                        ["2", "2 columns"],
                        ["3", "3 columns"],
                        ["4", "4 columns"],
                        ["5", "5 columns"],
                        ["6", "6 columns"],
                      ]}
                      onChange={(v) =>
                        patchDeep("layout", {
                          columns: Number(v) as 1 | 2 | 3 | 4 | 5 | 6,
                        })
                      }
                    />
                    <p className="text-[11.5px] leading-relaxed text-faint">
                      Field widths use a 12-column grid. Set per-field spans in the
                      Layout tab (desktop / tablet / mobile).
                    </p>
                    <SelectRow
                      label="Alignment"
                      value={theme.layout.alignment}
                      options={[
                        ["left", "Left"],
                        ["center", "Center"],
                        ["right", "Right"],
                        ["stretch", "Stretch"],
                      ]}
                      onChange={(v) =>
                        patchDeep("layout", {
                          alignment: v as FormTheme["layout"]["alignment"],
                        })
                      }
                    />
                    <RangeRow
                      label="Row gap"
                      value={theme.layout.rowGap}
                      min={0}
                      max={40}
                      onChange={(v) => patchDeep("layout", { rowGap: v })}
                    />
                    <RangeRow
                      label="Column gap"
                      value={theme.layout.columnGap}
                      min={0}
                      max={40}
                      onChange={(v) => patchDeep("layout", { columnGap: v })}
                    />
                    <RangeRow
                      label="Field margin"
                      value={theme.layout.fieldMargin}
                      min={0}
                      max={24}
                      onChange={(v) => patchDeep("layout", { fieldMargin: v })}
                    />
                    <RangeRow
                      label="Section margin"
                      value={theme.layout.sectionMargin}
                      min={0}
                      max={32}
                      onChange={(v) => patchDeep("layout", { sectionMargin: v })}
                    />
                    <RangeRow
                      label="Padding"
                      value={theme.layout.padding}
                      min={0}
                      max={40}
                      onChange={(v) => patchDeep("layout", { padding: v })}
                    />
                  </>
                )}

                {s.id === "container" && (
                  <>
                    <ColorRow
                      label="Background"
                      value={theme.container.backgroundColor}
                      onChange={(v) => patchDeep("container", { backgroundColor: v })}
                    />
                    <TextRow
                      label="Background image URL"
                      value={theme.container.backgroundImage}
                      onChange={(v) => patchDeep("container", { backgroundImage: v })}
                      placeholder="https://…"
                    />
                    <TextRow
                      label="Gradient"
                      value={theme.container.gradient}
                      onChange={(v) => patchDeep("container", { gradient: v })}
                      placeholder="linear-gradient(…)"
                    />
                    <ColorRow
                      label="Border color"
                      value={theme.container.borderColor}
                      onChange={(v) => patchDeep("container", { borderColor: v })}
                    />
                    <SelectRow
                      label="Border style"
                      value={theme.container.borderStyle}
                      options={[
                        ["none", "None"],
                        ["solid", "Solid"],
                        ["dashed", "Dashed"],
                        ["dotted", "Dotted"],
                      ]}
                      onChange={(v) =>
                        patchDeep("container", {
                          borderStyle: v as FormTheme["container"]["borderStyle"],
                        })
                      }
                    />
                    <RangeRow
                      label="Border width"
                      value={theme.container.borderWidth}
                      min={0}
                      max={8}
                      onChange={(v) => patchDeep("container", { borderWidth: v })}
                    />
                    <RangeRow
                      label="Border radius"
                      value={theme.container.borderRadius}
                      min={0}
                      max={32}
                      onChange={(v) => patchDeep("container", { borderRadius: v })}
                    />
                    <SelectRow
                      label="Shadow"
                      value={theme.container.shadow}
                      options={[
                        ["none", "None"],
                        ["sm", "Small"],
                        ["md", "Medium"],
                        ["lg", "Large"],
                        ["xl", "XL"],
                      ]}
                      onChange={(v) =>
                        patchDeep("container", {
                          shadow: v as FormTheme["container"]["shadow"],
                        })
                      }
                    />
                    <RangeRow
                      label="Blur (glass)"
                      value={theme.container.blur}
                      min={0}
                      max={24}
                      onChange={(v) => patchDeep("container", { blur: v })}
                    />
                    <RangeRow
                      label="Max width"
                      value={theme.container.maxWidth}
                      min={280}
                      max={960}
                      onChange={(v) => patchDeep("container", { maxWidth: v })}
                    />
                    <RangeRow
                      label="Padding"
                      value={theme.container.padding}
                      min={0}
                      max={48}
                      onChange={(v) => patchDeep("container", { padding: v })}
                    />
                    <RangeRow
                      label="Margin Y"
                      value={theme.container.marginY}
                      min={0}
                      max={48}
                      onChange={(v) => patchDeep("container", { marginY: v })}
                    />
                  </>
                )}

                {s.id === "typography" && (
                  <>
                    <GoogleFontPicker
                      label="Font family"
                      value={parseStoredFontFamily(theme.typography.fontFamily)}
                      onChange={(family) =>
                        patchDeep("typography", {
                          fontFamily:
                            family === "system"
                              ? "system-ui, -apple-system, Segoe UI, sans-serif"
                              : googleFontStack(family),
                        })
                      }
                    />
                    <RangeRow
                      label="Font size"
                      value={theme.typography.fontSize}
                      min={12}
                      max={22}
                      onChange={(v) => patchDeep("typography", { fontSize: v })}
                    />
                    <RangeRow
                      label="Font weight"
                      value={theme.typography.fontWeight}
                      min={300}
                      max={800}
                      step={100}
                      onChange={(v) => patchDeep("typography", { fontWeight: v })}
                    />
                    <SelectRow
                      label="Font style"
                      value={theme.typography.fontStyle}
                      options={[
                        ["normal", "Normal"],
                        ["italic", "Italic"],
                      ]}
                      onChange={(v) =>
                        patchDeep("typography", {
                          fontStyle: v as FormTheme["typography"]["fontStyle"],
                        })
                      }
                    />
                    <RangeRow
                      label="Letter spacing"
                      value={theme.typography.letterSpacing}
                      min={-1}
                      max={4}
                      onChange={(v) => patchDeep("typography", { letterSpacing: v })}
                    />
                    <RangeRow
                      label="Line height"
                      value={Math.round(theme.typography.lineHeight * 100)}
                      min={110}
                      max={200}
                      suffix="%"
                      onChange={(v) =>
                        patchDeep("typography", { lineHeight: v / 100 })
                      }
                    />
                    <SelectRow
                      label="Text transform"
                      value={theme.typography.textTransform}
                      options={[
                        ["none", "None"],
                        ["uppercase", "Uppercase"],
                        ["capitalize", "Capitalize"],
                        ["lowercase", "Lowercase"],
                      ]}
                      onChange={(v) =>
                        patchDeep("typography", {
                          textTransform: v as FormTheme["typography"]["textTransform"],
                        })
                      }
                    />
                    <ColorRow
                      label="Text color"
                      value={theme.typography.color}
                      onChange={(v) => patchDeep("typography", { color: v })}
                    />
                  </>
                )}

                {s.id === "labels" && (
                  <>
                    <ToggleRow
                      label="Show labels"
                      checked={theme.labels.show}
                      onChange={(v) => patchDeep("labels", { show: v })}
                    />
                    <SelectRow
                      label="Label style"
                      value={theme.labels.style ?? "stacked"}
                      options={[
                        ["stacked", "Top (stacked)"],
                        ["left", "Left"],
                        ["right", "Right"],
                        ["floating", "Floating (on border)"],
                        ["hidden", "Hidden"],
                      ]}
                      onChange={(v) =>
                        patchDeep("labels", {
                          style: v as FormTheme["labels"]["style"],
                        })
                      }
                    />
                    <p className="text-[11.5px] leading-relaxed text-faint">
                      Form-wide default. Each field can override label position in
                      Field settings. Floating captions use the field title, or the
                      placeholder when the title is empty.
                    </p>
                    <ColorRow
                      label="Color"
                      value={theme.labels.color}
                      onChange={(v) => patchDeep("labels", { color: v })}
                    />
                    <RangeRow
                      label="Size"
                      value={theme.labels.size}
                      min={11}
                      max={18}
                      onChange={(v) => patchDeep("labels", { size: v })}
                    />
                    <RangeRow
                      label="Weight"
                      value={theme.labels.weight}
                      min={400}
                      max={800}
                      step={100}
                      onChange={(v) => patchDeep("labels", { weight: v })}
                    />
                    <RangeRow
                      label="Margin bottom"
                      value={theme.labels.marginBottom}
                      min={0}
                      max={16}
                      onChange={(v) => patchDeep("labels", { marginBottom: v })}
                    />
                    <ColorRow
                      label="Required mark"
                      value={theme.labels.requiredColor}
                      onChange={(v) => patchDeep("labels", { requiredColor: v })}
                    />
                    <TextRow
                      label="Required text"
                      value={theme.labels.requiredText}
                      onChange={(v) => patchDeep("labels", { requiredText: v })}
                    />
                  </>
                )}

                {s.id === "placeholder" && (
                  <>
                    <SelectRow
                      label="Placeholder mode"
                      value={theme.placeholder.mode ?? "enabled"}
                      options={[
                        ["enabled", "Enabled"],
                        ["disabled", "Disabled"],
                        ["animated", "Animated (float to border)"],
                        ["floating", "Force floating labels"],
                      ]}
                      onChange={(v) =>
                        patchDeep("placeholder", {
                          mode: v as FormTheme["placeholder"]["mode"],
                        })
                      }
                    />
                    <ColorRow
                      label="Color"
                      value={theme.placeholder.color}
                      onChange={(v) => patchDeep("placeholder", { color: v })}
                    />
                    <RangeRow
                      label="Opacity"
                      value={Math.round(theme.placeholder.opacity * 100)}
                      min={20}
                      max={100}
                      suffix="%"
                      onChange={(v) =>
                        patchDeep("placeholder", { opacity: v / 100 })
                      }
                    />
                    <RangeRow
                      label="Font size"
                      value={theme.placeholder.fontSize}
                      min={11}
                      max={18}
                      onChange={(v) => patchDeep("placeholder", { fontSize: v })}
                    />
                    <SelectRow
                      label="Font style"
                      value={theme.placeholder.fontStyle}
                      options={[
                        ["normal", "Normal"],
                        ["italic", "Italic"],
                      ]}
                      onChange={(v) =>
                        patchDeep("placeholder", {
                          fontStyle: v as FormTheme["placeholder"]["fontStyle"],
                        })
                      }
                    />
                  </>
                )}

                {s.id === "input" && (
                  <>
                    <ColorRow
                      label="Background"
                      value={theme.input.background}
                      onChange={(v) => patchDeep("input", { background: v })}
                    />
                    <ColorRow
                      label="Border"
                      value={theme.input.borderColor}
                      onChange={(v) => patchDeep("input", { borderColor: v })}
                    />
                    <ColorRow
                      label="Text"
                      value={theme.input.textColor}
                      onChange={(v) => patchDeep("input", { textColor: v })}
                    />
                    <RangeRow
                      label="Border width"
                      value={theme.input.borderWidth}
                      min={0}
                      max={4}
                      onChange={(v) => patchDeep("input", { borderWidth: v })}
                    />
                    <RangeRow
                      label="Radius"
                      value={theme.input.borderRadius}
                      min={0}
                      max={24}
                      onChange={(v) => patchDeep("input", { borderRadius: v })}
                    />
                    <RangeRow
                      label="Height"
                      value={theme.input.height}
                      min={32}
                      max={64}
                      onChange={(v) => patchDeep("input", { height: v })}
                    />
                    <RangeRow
                      label="Padding X"
                      value={theme.input.paddingX}
                      min={6}
                      max={28}
                      onChange={(v) => patchDeep("input", { paddingX: v })}
                    />
                    <RangeRow
                      label="Padding Y"
                      value={theme.input.paddingY}
                      min={4}
                      max={20}
                      onChange={(v) => patchDeep("input", { paddingY: v })}
                    />
                    <SelectRow
                      label="Shadow"
                      value={theme.input.shadow}
                      options={[
                        ["none", "None"],
                        ["sm", "Small"],
                        ["md", "Medium"],
                      ]}
                      onChange={(v) =>
                        patchDeep("input", {
                          shadow: v as FormTheme["input"]["shadow"],
                        })
                      }
                    />
                    <RangeRow
                      label="Transition"
                      value={theme.input.transitionMs}
                      min={0}
                      max={400}
                      suffix="ms"
                      onChange={(v) => patchDeep("input", { transitionMs: v })}
                    />
                    <p className="text-[11px] font-semibold text-faint uppercase">
                      States
                    </p>
                    <ColorRow
                      label="Hover border"
                      value={theme.input.states.hover?.borderColor ?? theme.input.borderColor}
                      onChange={(v) =>
                        patchDeep("input", {
                          states: {
                            ...theme.input.states,
                            hover: { ...theme.input.states.hover, borderColor: v },
                          },
                        })
                      }
                    />
                    <ColorRow
                      label="Focus border"
                      value={
                        theme.input.states.focus?.borderColor ?? theme.tokens.primary
                      }
                      onChange={(v) =>
                        patchDeep("input", {
                          states: {
                            ...theme.input.states,
                            focus: { ...theme.input.states.focus, borderColor: v },
                          },
                        })
                      }
                    />
                    <ColorRow
                      label="Error border"
                      value={
                        theme.input.states.error?.borderColor ?? theme.tokens.danger
                      }
                      onChange={(v) =>
                        patchDeep("input", {
                          states: {
                            ...theme.input.states,
                            error: { ...theme.input.states.error, borderColor: v },
                          },
                        })
                      }
                    />
                    <ColorRow
                      label="Success border"
                      value={
                        theme.input.states.success?.borderColor ?? theme.tokens.success
                      }
                      onChange={(v) =>
                        patchDeep("input", {
                          states: {
                            ...theme.input.states,
                            success: {
                              ...theme.input.states.success,
                              borderColor: v,
                            },
                          },
                        })
                      }
                    />
                    <ColorRow
                      label="Disabled background"
                      value={
                        theme.input.states.disabled?.background ?? "#f1f4f8"
                      }
                      onChange={(v) =>
                        patchDeep("input", {
                          states: {
                            ...theme.input.states,
                            disabled: {
                              ...theme.input.states.disabled,
                              background: v,
                            },
                          },
                        })
                      }
                    />
                  </>
                )}

                {s.id === "buttons" && (
                  <>
                    <p className="text-[11px] font-semibold text-faint uppercase">
                      Submit
                    </p>
                    <ButtonEditor
                      mode="submit"
                      style={theme.buttons.submit}
                      onChange={(submit) =>
                        patch("buttons", { ...theme.buttons, submit })
                      }
                    />
                    <p className="text-[11px] font-semibold text-faint uppercase">
                      Next
                    </p>
                    <ButtonEditor
                      mode="simple"
                      style={theme.buttons.next}
                      onChange={(next) =>
                        patch("buttons", { ...theme.buttons, next })
                      }
                    />
                    <p className="text-[11px] font-semibold text-faint uppercase">
                      Previous
                    </p>
                    <ButtonEditor
                      mode="simple"
                      style={theme.buttons.previous}
                      onChange={(previous) =>
                        patch("buttons", { ...theme.buttons, previous })
                      }
                    />
                    <p className="text-[11px] font-semibold text-faint uppercase">
                      Reset
                    </p>
                    <ButtonEditor
                      mode="simple"
                      style={theme.buttons.reset}
                      onChange={(reset) =>
                        patch("buttons", { ...theme.buttons, reset })
                      }
                    />
                    <p className="text-[11px] font-semibold text-faint uppercase">
                      Save draft
                    </p>
                    <ButtonEditor
                      mode="simple"
                      style={theme.buttons.saveDraft}
                      onChange={(saveDraft) =>
                        patch("buttons", { ...theme.buttons, saveDraft })
                      }
                    />
                  </>
                )}

                {s.id === "icons" && (
                  <>
                    <ToggleRow
                      label="Enable icons"
                      checked={theme.icons.enabled}
                      onChange={(v) => patchDeep("icons", { enabled: v })}
                    />
                    <RangeRow
                      label="Size"
                      value={theme.icons.size}
                      min={12}
                      max={32}
                      onChange={(v) => patchDeep("icons", { size: v })}
                    />
                    <ColorRow
                      label="Color"
                      value={theme.icons.color}
                      onChange={(v) => patchDeep("icons", { color: v })}
                    />
                    <SelectRow
                      label="Position"
                      value={theme.icons.position}
                      options={[
                        ["left", "Left"],
                        ["right", "Right"],
                        ["inside-left", "Inside left"],
                        ["inside-right", "Inside right"],
                      ]}
                      onChange={(v) =>
                        patchDeep("icons", {
                          position: v as FormTheme["icons"]["position"],
                        })
                      }
                    />
                    <RangeRow
                      label="Gap"
                      value={theme.icons.gap}
                      min={0}
                      max={20}
                      onChange={(v) => patchDeep("icons", { gap: v })}
                    />
                  </>
                )}

                {s.id === "fileUpload" && (
                  <>
                    <ColorRow
                      label="Background"
                      value={theme.fileUpload.background}
                      onChange={(v) => patchDeep("fileUpload", { background: v })}
                    />
                    <ColorRow
                      label="Hover"
                      value={theme.fileUpload.hoverBackground}
                      onChange={(v) =>
                        patchDeep("fileUpload", { hoverBackground: v })
                      }
                    />
                    <ColorRow
                      label="Drag state"
                      value={theme.fileUpload.dragBackground}
                      onChange={(v) =>
                        patchDeep("fileUpload", { dragBackground: v })
                      }
                    />
                    <ColorRow
                      label="Border"
                      value={theme.fileUpload.borderColor}
                      onChange={(v) => patchDeep("fileUpload", { borderColor: v })}
                    />
                    <SelectRow
                      label="Border style"
                      value={theme.fileUpload.borderStyle}
                      options={[
                        ["solid", "Solid"],
                        ["dashed", "Dashed"],
                        ["dotted", "Dotted"],
                      ]}
                      onChange={(v) =>
                        patchDeep("fileUpload", {
                          borderStyle: v as FormTheme["fileUpload"]["borderStyle"],
                        })
                      }
                    />
                    <RangeRow
                      label="Radius"
                      value={theme.fileUpload.borderRadius}
                      min={0}
                      max={24}
                      onChange={(v) =>
                        patchDeep("fileUpload", { borderRadius: v })
                      }
                    />
                    <ColorRow
                      label="Progress"
                      value={theme.fileUpload.progressColor}
                      onChange={(v) =>
                        patchDeep("fileUpload", { progressColor: v })
                      }
                    />
                    <RangeRow
                      label="Padding"
                      value={theme.fileUpload.padding}
                      min={8}
                      max={40}
                      onChange={(v) => patchDeep("fileUpload", { padding: v })}
                    />
                  </>
                )}

                {s.id === "checkbox" && (
                  <>
                    <SelectRow
                      label="Shape"
                      value={theme.checkbox.shape}
                      options={[
                        ["square", "Square"],
                        ["rounded", "Rounded"],
                        ["circle", "Circle"],
                      ]}
                      onChange={(v) =>
                        patchDeep("checkbox", {
                          shape: v as FormTheme["checkbox"]["shape"],
                        })
                      }
                    />
                    <RangeRow
                      label="Size"
                      value={theme.checkbox.size}
                      min={14}
                      max={28}
                      onChange={(v) => patchDeep("checkbox", { size: v })}
                    />
                    <ColorRow
                      label="Border"
                      value={theme.checkbox.borderColor}
                      onChange={(v) => patchDeep("checkbox", { borderColor: v })}
                    />
                    <ColorRow
                      label="Checked"
                      value={theme.checkbox.checkedColor}
                      onChange={(v) => patchDeep("checkbox", { checkedColor: v })}
                    />
                    <ColorRow
                      label="Hover border"
                      value={theme.checkbox.hoverBorder}
                      onChange={(v) => patchDeep("checkbox", { hoverBorder: v })}
                    />
                  </>
                )}

                {s.id === "radio" && (
                  <>
                    <SelectRow
                      label="Style"
                      value={theme.radio.style}
                      options={[
                        ["circle", "Circle"],
                        ["filled", "Filled"],
                        ["outline", "Outline"],
                      ]}
                      onChange={(v) =>
                        patchDeep("radio", {
                          style: v as FormTheme["radio"]["style"],
                        })
                      }
                    />
                    <RangeRow
                      label="Size"
                      value={theme.radio.size}
                      min={14}
                      max={28}
                      onChange={(v) => patchDeep("radio", { size: v })}
                    />
                    <ColorRow
                      label="Border"
                      value={theme.radio.borderColor}
                      onChange={(v) => patchDeep("radio", { borderColor: v })}
                    />
                    <ColorRow
                      label="Checked"
                      value={theme.radio.checkedColor}
                      onChange={(v) => patchDeep("radio", { checkedColor: v })}
                    />
                  </>
                )}

                {s.id === "toggle" && (
                  <>
                    <SelectRow
                      label="Style"
                      value={theme.toggle.style}
                      options={[
                        ["android", "Android"],
                        ["ios", "iOS"],
                        ["modern", "Modern"],
                      ]}
                      onChange={(v) =>
                        patchDeep("toggle", {
                          style: v as FormTheme["toggle"]["style"],
                        })
                      }
                    />
                    <RangeRow
                      label="Size"
                      value={theme.toggle.size}
                      min={16}
                      max={32}
                      onChange={(v) => patchDeep("toggle", { size: v })}
                    />
                    <ColorRow
                      label="Active"
                      value={theme.toggle.activeColor}
                      onChange={(v) => patchDeep("toggle", { activeColor: v })}
                    />
                    <ColorRow
                      label="Inactive"
                      value={theme.toggle.inactiveColor}
                      onChange={(v) => patchDeep("toggle", { inactiveColor: v })}
                    />
                    <ColorRow
                      label="Thumb"
                      value={theme.toggle.thumbColor}
                      onChange={(v) => patchDeep("toggle", { thumbColor: v })}
                    />
                  </>
                )}

                {s.id === "dropdown" && (
                  <>
                    <ColorRow
                      label="Arrow"
                      value={theme.dropdown.arrowColor}
                      onChange={(v) => patchDeep("dropdown", { arrowColor: v })}
                    />
                    <ToggleRow
                      label="Search box"
                      checked={theme.dropdown.searchEnabled}
                      onChange={(v) =>
                        patchDeep("dropdown", { searchEnabled: v })
                      }
                    />
                    <ColorRow
                      label="Border"
                      value={theme.dropdown.borderColor}
                      onChange={(v) => patchDeep("dropdown", { borderColor: v })}
                    />
                    <RangeRow
                      label="Radius"
                      value={theme.dropdown.borderRadius}
                      min={0}
                      max={24}
                      onChange={(v) =>
                        patchDeep("dropdown", { borderRadius: v })
                      }
                    />
                    <ColorRow
                      label="Background"
                      value={theme.dropdown.background}
                      onChange={(v) => patchDeep("dropdown", { background: v })}
                    />
                  </>
                )}

                {s.id === "datePicker" && (
                  <>
                    <SelectRow
                      label="Calendar theme"
                      value={theme.datePicker.calendarTheme}
                      options={[
                        ["light", "Light"],
                        ["dark", "Dark"],
                        ["brand", "Brand"],
                      ]}
                      onChange={(v) =>
                        patchDeep("datePicker", {
                          calendarTheme: v as FormTheme["datePicker"]["calendarTheme"],
                        })
                      }
                    />
                    <ColorRow
                      label="Weekend"
                      value={theme.datePicker.weekendColor}
                      onChange={(v) =>
                        patchDeep("datePicker", { weekendColor: v })
                      }
                    />
                    <ColorRow
                      label="Today highlight"
                      value={theme.datePicker.todayHighlight}
                      onChange={(v) =>
                        patchDeep("datePicker", { todayHighlight: v })
                      }
                    />
                    <ColorRow
                      label="Selected"
                      value={theme.datePicker.selectedColor}
                      onChange={(v) =>
                        patchDeep("datePicker", { selectedColor: v })
                      }
                    />
                  </>
                )}

                {s.id === "range" && (
                  <>
                    <ColorRow
                      label="Track"
                      value={theme.range.trackColor}
                      onChange={(v) => patchDeep("range", { trackColor: v })}
                    />
                    <ColorRow
                      label="Active track"
                      value={theme.range.activeTrackColor}
                      onChange={(v) =>
                        patchDeep("range", { activeTrackColor: v })
                      }
                    />
                    <ColorRow
                      label="Thumb"
                      value={theme.range.thumbColor}
                      onChange={(v) => patchDeep("range", { thumbColor: v })}
                    />
                    <RangeRow
                      label="Thumb size"
                      value={theme.range.thumbSize}
                      min={12}
                      max={28}
                      onChange={(v) => patchDeep("range", { thumbSize: v })}
                    />
                    <ToggleRow
                      label="Value bubble"
                      checked={theme.range.showBubble}
                      onChange={(v) => patchDeep("range", { showBubble: v })}
                    />
                  </>
                )}

                {s.id === "rating" && (
                  <>
                    <SelectRow
                      label="Icon"
                      value={theme.rating.icon}
                      options={[
                        ["star", "Star"],
                        ["heart", "Heart"],
                        ["emoji", "Emoji"],
                        ["custom", "Custom"],
                      ]}
                      onChange={(v) =>
                        patchDeep("rating", {
                          icon: v as FormTheme["rating"]["icon"],
                        })
                      }
                    />
                    {theme.rating.icon === "custom" && (
                      <TextRow
                        label="Custom icon"
                        value={theme.rating.customIcon}
                        onChange={(v) =>
                          patchDeep("rating", { customIcon: v })
                        }
                      />
                    )}
                    <RangeRow
                      label="Size"
                      value={theme.rating.size}
                      min={16}
                      max={40}
                      onChange={(v) => patchDeep("rating", { size: v })}
                    />
                    <ColorRow
                      label="Active"
                      value={theme.rating.activeColor}
                      onChange={(v) => patchDeep("rating", { activeColor: v })}
                    />
                    <ColorRow
                      label="Inactive"
                      value={theme.rating.inactiveColor}
                      onChange={(v) =>
                        patchDeep("rating", { inactiveColor: v })
                      }
                    />
                    <RangeRow
                      label="Max"
                      value={theme.rating.max}
                      min={3}
                      max={10}
                      onChange={(v) => patchDeep("rating", { max: v })}
                    />
                  </>
                )}

                {s.id === "signature" && (
                  <>
                    <ColorRow
                      label="Canvas"
                      value={theme.signature.canvasColor}
                      onChange={(v) =>
                        patchDeep("signature", { canvasColor: v })
                      }
                    />
                    <ColorRow
                      label="Border"
                      value={theme.signature.borderColor}
                      onChange={(v) =>
                        patchDeep("signature", { borderColor: v })
                      }
                    />
                    <RangeRow
                      label="Border width"
                      value={theme.signature.borderWidth}
                      min={0}
                      max={4}
                      onChange={(v) =>
                        patchDeep("signature", { borderWidth: v })
                      }
                    />
                    <ColorRow
                      label="Pen"
                      value={theme.signature.penColor}
                      onChange={(v) => patchDeep("signature", { penColor: v })}
                    />
                    <RangeRow
                      label="Height"
                      value={theme.signature.height}
                      min={100}
                      max={320}
                      onChange={(v) => patchDeep("signature", { height: v })}
                    />
                  </>
                )}

                {s.id === "recaptcha" && (
                  <>
                    <SelectRow
                      label="Theme"
                      value={theme.recaptcha.theme}
                      options={[
                        ["light", "Light"],
                        ["dark", "Dark"],
                      ]}
                      onChange={(v) =>
                        patchDeep("recaptcha", {
                          theme: v as FormTheme["recaptcha"]["theme"],
                        })
                      }
                    />
                    <SelectRow
                      label="Size"
                      value={theme.recaptcha.size}
                      options={[
                        ["normal", "Normal"],
                        ["compact", "Compact"],
                      ]}
                      onChange={(v) =>
                        patchDeep("recaptcha", {
                          size: v as FormTheme["recaptcha"]["size"],
                        })
                      }
                    />
                  </>
                )}

                {s.id === "progress" && (
                  <>
                    <SelectRow
                      label="Style"
                      value={theme.progress.style}
                      options={[
                        ["line", "Line"],
                        ["number", "Number"],
                        ["circle", "Circle"],
                        ["percentage", "Percentage"],
                      ]}
                      onChange={(v) =>
                        patchDeep("progress", {
                          style: v as FormTheme["progress"]["style"],
                        })
                      }
                    />
                    <ColorRow
                      label="Active"
                      value={theme.progress.activeColor}
                      onChange={(v) => patchDeep("progress", { activeColor: v })}
                    />
                    <ColorRow
                      label="Completed"
                      value={theme.progress.completedColor}
                      onChange={(v) => patchDeep("progress", { completedColor: v })}
                    />
                    <ColorRow
                      label="Pending"
                      value={theme.progress.pendingColor}
                      onChange={(v) => patchDeep("progress", { pendingColor: v })}
                    />
                    <RangeRow
                      label="Height"
                      value={theme.progress.height}
                      min={2}
                      max={16}
                      onChange={(v) => patchDeep("progress", { height: v })}
                    />
                    <ToggleRow
                      label="Animation"
                      checked={theme.progress.animated}
                      onChange={(v) => patchDeep("progress", { animated: v })}
                    />
                  </>
                )}

                {s.id === "section" && (
                  <>
                    <ColorRow
                      label="Border"
                      value={theme.section.borderColor}
                      onChange={(v) => patchDeep("section", { borderColor: v })}
                    />
                    <RangeRow
                      label="Border width"
                      value={theme.section.borderWidth}
                      min={0}
                      max={4}
                      onChange={(v) => patchDeep("section", { borderWidth: v })}
                    />
                    <ToggleRow
                      label="Divider"
                      checked={theme.section.divider}
                      onChange={(v) => patchDeep("section", { divider: v })}
                    />
                    <RangeRow
                      label="Font size"
                      value={theme.section.fontSize}
                      min={12}
                      max={22}
                      onChange={(v) => patchDeep("section", { fontSize: v })}
                    />
                    <RangeRow
                      label="Font weight"
                      value={theme.section.fontWeight}
                      min={400}
                      max={800}
                      step={100}
                      onChange={(v) => patchDeep("section", { fontWeight: v })}
                    />
                    <RangeRow
                      label="Margin Y"
                      value={theme.section.marginY}
                      min={0}
                      max={32}
                      onChange={(v) => patchDeep("section", { marginY: v })}
                    />
                    <RangeRow
                      label="Padding Y"
                      value={theme.section.paddingY}
                      min={0}
                      max={24}
                      onChange={(v) => patchDeep("section", { paddingY: v })}
                    />
                  </>
                )}

                {s.id === "validation" && (
                  <ToneEditor
                    tones={theme.validation}
                    onChange={(validation) => patch("validation", validation)}
                  />
                )}

                {s.id === "messages" && (
                  <ToneEditor
                    tones={theme.messages}
                    onChange={(messages) => patch("messages", messages)}
                  />
                )}

                {s.id === "animation" && (
                  <>
                    <SelectRow
                      label="Type"
                      value={theme.animation.type}
                      options={[
                        ["none", "None"],
                        ["fade", "Fade"],
                        ["slide", "Slide"],
                        ["zoom", "Zoom"],
                        ["bounce", "Bounce"],
                      ]}
                      onChange={(v) =>
                        patchDeep("animation", {
                          type: v as FormTheme["animation"]["type"],
                        })
                      }
                    />
                    <RangeRow
                      label="Duration"
                      value={theme.animation.durationMs}
                      min={0}
                      max={800}
                      suffix="ms"
                      onChange={(v) => patchDeep("animation", { durationMs: v })}
                    />
                    <RangeRow
                      label="Delay"
                      value={theme.animation.delayMs}
                      min={0}
                      max={600}
                      suffix="ms"
                      onChange={(v) => patchDeep("animation", { delayMs: v })}
                    />
                  </>
                )}

                {s.id === "responsive" && (
                  <>
                    {(["desktop", "tablet", "mobile"] as const).map((bp) => (
                      <div key={bp} className="flex flex-col gap-2 rounded-md border border-[#eef1f6] p-2">
                        <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">
                          {bp}
                        </p>
                        <RangeRow
                          label="Font size"
                          value={theme.responsive[bp].fontSize}
                          min={12}
                          max={20}
                          onChange={(v) =>
                            patchDeep("responsive", {
                              [bp]: { ...theme.responsive[bp], fontSize: v },
                            })
                          }
                        />
                        <RangeRow
                          label="Padding"
                          value={theme.responsive[bp].padding}
                          min={0}
                          max={32}
                          onChange={(v) =>
                            patchDeep("responsive", {
                              [bp]: { ...theme.responsive[bp], padding: v },
                            })
                          }
                        />
                        <SelectRow
                          label="Columns"
                          value={String(theme.responsive[bp].columns)}
                          options={[
                            ["1", "1"],
                            ["2", "2"],
                            ["3", "3"],
                          ]}
                          onChange={(v) =>
                            patchDeep("responsive", {
                              [bp]: {
                                ...theme.responsive[bp],
                                columns: Number(v) as 1 | 2 | 3,
                              },
                            })
                          }
                        />
                        <SelectRow
                          label="Width"
                          value={theme.responsive[bp].width}
                          options={[
                            ["auto", "Auto"],
                            ["sm", "Small"],
                            ["md", "Medium"],
                            ["lg", "Large"],
                            ["full", "Full"],
                          ]}
                          onChange={(v) =>
                            patchDeep("responsive", {
                              [bp]: {
                                ...theme.responsive[bp],
                                width: v as FormTheme["responsive"]["desktop"]["width"],
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </>
                )}

                {s.id === "conditional" && (
                  <ConditionalStylesEditor
                    rules={theme.conditionalStyles}
                    onChange={(conditionalStyles) =>
                      patch("conditionalStyles", conditionalStyles)
                    }
                  />
                )}

                {s.id === "advanced" && (
                  <>
                    <TextRow
                      label="Custom class"
                      value={theme.advanced.customClass}
                      onChange={(v) => patchDeep("advanced", { customClass: v })}
                      placeholder="my-form"
                    />
                    <TextRow
                      label="Custom ID"
                      value={theme.advanced.customId}
                      onChange={(v) => patchDeep("advanced", { customId: v })}
                      placeholder="contact-form"
                    />
                    <div>
                      <p className="mb-1.5 text-[11.5px] font-semibold text-muted">
                        CSS snippets
                      </p>
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {CUSTOM_CSS_SNIPPETS.map((snip) => (
                          <button
                            key={snip.id}
                            type="button"
                            onClick={() => {
                              const cur = theme.advanced.customCss?.trim() ?? "";
                              const next = cur.includes(snip.css)
                                ? cur
                                : cur
                                  ? `${cur}\n${snip.css}`
                                  : snip.css;
                              patchDeep("advanced", { customCss: next });
                            }}
                            className="rounded-md border border-[#dbe1ea] bg-white px-2 py-1 text-[11px] font-semibold text-muted hover:border-brand hover:text-brand"
                          >
                            {snip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                        Custom CSS
                      </span>
                      <textarea
                        rows={5}
                        value={theme.advanced.customCss}
                        onChange={(e) =>
                          patchDeep("advanced", { customCss: e.target.value })
                        }
                        placeholder=".avonix-form .avx-submit { … }"
                        className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[11.5px] outline-none focus:border-brand"
                      />
                    </label>
                  </>
                )}

                {s.id === "dark" && (
                  <>
                    <ToggleRow
                      label="Dark mode enabled"
                      checked={theme.darkMode.enabled}
                      onChange={(v) =>
                        patchDeep("darkMode", { enabled: v })
                      }
                    />
                    <SelectRow
                      label="Mode"
                      value={theme.darkMode.mode}
                      options={[
                        ["off", "Off"],
                        ["auto", "Auto detect"],
                        ["manual", "Manual"],
                      ]}
                      onChange={(v) =>
                        patchDeep("darkMode", {
                          mode: v as FormTheme["darkMode"]["mode"],
                        })
                      }
                    />
                    <ToggleRow
                      label="RTL support"
                      checked={theme.rtl}
                      onChange={(v) =>
                        commit({ ...theme, presetId: "custom", rtl: v })
                      }
                    />
                  </>
                )}

                {s.id === "a11y" && (
                  <>
                    <ToggleRow
                      label="Focus ring"
                      checked={theme.a11y.focusRing}
                      onChange={(v) => patchDeep("a11y", { focusRing: v })}
                    />
                    <ToggleRow
                      label="Contrast mode"
                      checked={theme.a11y.contrastMode}
                      onChange={(v) => patchDeep("a11y", { contrastMode: v })}
                    />
                    <ToggleRow
                      label="Font scaling"
                      checked={theme.a11y.fontScaling}
                      onChange={(v) => patchDeep("a11y", { fontScaling: v })}
                    />
                    <ToggleRow
                      label="Keyboard navigation"
                      checked={theme.a11y.keyboardNav}
                      onChange={(v) => patchDeep("a11y", { keyboardNav: v })}
                    />
                  </>
                )}

                {s.id === "library" && (
                  <>
                    <TextRow
                      label="Theme name"
                      value={libraryName}
                      onChange={setLibraryName}
                      placeholder="Agency brand kit"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSaved(saveThemeToLibrary(libraryName, theme));
                        setLibraryName("");
                      }}
                      className="rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Save to global library
                    </button>
                    {saved.length === 0 ? (
                      <p className="text-[12px] text-muted">
                        No saved themes yet. Save one to reuse across forms.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {saved.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-lg border border-[#e6e9f0] px-2.5 py-2"
                          >
                            <p className="text-[12.5px] font-semibold">{item.name}</p>
                            <p className="text-[10.5px] text-faint">
                              {new Date(item.updatedAt).toLocaleString()}
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  const t = loadThemeFromLibrary(item.id);
                                  if (t) commit(t);
                                }}
                                className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11px] font-semibold"
                              >
                                Load
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSaved(duplicateThemeInLibrary(item.id))
                                }
                                className="rounded-md border border-[#dbe1ea] px-2 py-1 text-[11px] font-semibold"
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setSaved(deleteThemeFromLibrary(item.id))
                                }
                                className="rounded-md border border-[#fecdca] px-2 py-1 text-[11px] font-semibold text-bad"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {s.id === "import" && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(exportJson);
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Copy theme JSON
                    </button>
                    <label className="block">
                      <span className="mb-1 block text-[11.5px] font-semibold text-muted">
                        Import JSON
                      </span>
                      <textarea
                        rows={4}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder='{"version":1,…}'
                        className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 font-mono text-[11.5px] outline-none focus:border-brand"
                      />
                    </label>
                    {importError && (
                      <p className="text-[12px] text-bad">{importError}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(importText) as FormTheme;
                          commit(mergeTheme(parsed));
                          setImportError(null);
                          setImportText("");
                        } catch {
                          setImportError("Invalid JSON theme.");
                        }
                      }}
                      className="rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Load theme
                    </button>
                    <button
                      type="button"
                      onClick={() => commit(structuredClone(DEFAULT_THEME))}
                      className="rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
                    >
                      Reset to defaults
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PresetGrid({
  active,
  onPick,
}: {
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {THEME_PRESETS.filter((p) => p.id !== "custom").map((p) => {
        const selected = active === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className={`rounded-lg border px-2 py-2 text-left transition ${
              selected
                ? "border-brand bg-[rgba(255,102,0,.06)]"
                : "border-[#e6e9f0] hover:border-brand/50"
            }`}
          >
            <span className="block text-[12px] font-semibold text-[#13233c]">
              {p.label}
            </span>
            <span className="block text-[10.5px] text-faint">{p.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

function ConditionalStylesEditor({
  rules,
  onChange,
}: {
  rules: ConditionalStyleRule[];
  onChange: (rules: ConditionalStyleRule[]) => void;
}) {
  const add = () => {
    onChange([
      ...rules,
      {
        id: `csr_${Date.now().toString(36)}`,
        fieldKey: "",
        op: "eq",
        value: "",
        className: "avx-cond-highlight",
        primaryOverride: "",
      },
    ]);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] leading-relaxed text-muted">
        When a field matches a rule, apply a CSS class (and optional primary color) to the form.
      </p>
      {rules.map((rule, idx) => (
        <div
          key={rule.id}
          className="flex flex-col gap-2 rounded-md border border-[#eef1f6] p-2"
        >
          <TextRow
            label="Field key"
            value={rule.fieldKey}
            onChange={(v) => {
              const next = [...rules];
              next[idx] = { ...rule, fieldKey: v };
              onChange(next);
            }}
            placeholder="email"
          />
          <SelectRow
            label="Operator"
            value={rule.op}
            options={[
              ["eq", "equals"],
              ["neq", "does not equal"],
              ["filled", "is filled"],
              ["empty", "is empty"],
            ]}
            onChange={(v) => {
              const next = [...rules];
              next[idx] = {
                ...rule,
                op: v as ConditionalStyleRule["op"],
              };
              onChange(next);
            }}
          />
          {(rule.op === "eq" || rule.op === "neq") && (
            <TextRow
              label="Value"
              value={rule.value ?? ""}
              onChange={(v) => {
                const next = [...rules];
                next[idx] = { ...rule, value: v };
                onChange(next);
              }}
            />
          )}
          <TextRow
            label="CSS class"
            value={rule.className}
            onChange={(v) => {
              const next = [...rules];
              next[idx] = { ...rule, className: v };
              onChange(next);
            }}
          />
          <ColorRow
            label="Primary override"
            value={rule.primaryOverride || "#ff6600"}
            onChange={(v) => {
              const next = [...rules];
              next[idx] = { ...rule, primaryOverride: v };
              onChange(next);
            }}
          />
          <button
            type="button"
            onClick={() => onChange(rules.filter((_, i) => i !== idx))}
            className="rounded-md border border-[#fecdca] py-1.5 text-[11.5px] font-semibold text-bad"
          >
            Remove rule
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded-lg border border-[#dbe1ea] py-2 text-[12.5px] font-semibold text-muted hover:border-brand hover:text-brand"
      >
        Add conditional style
      </button>
    </div>
  );
}

function ButtonEditor({
  style,
  onChange,
  mode = "simple",
}: {
  style: FormTheme["buttons"]["submit"];
  onChange: (s: FormTheme["buttons"]["submit"]) => void;
  /** Submit alone gets width/alignment; other buttons stay color + size. */
  mode?: "submit" | "simple";
}) {
  return (
    <div className="flex flex-col gap-2">
      <ColorRow
        label="Background"
        value={style.background}
        onChange={(v) => onChange({ ...style, background: v, borderColor: v })}
      />
      <ColorRow
        label="Text"
        value={style.textColor}
        onChange={(v) => onChange({ ...style, textColor: v })}
      />
      <RangeRow
        label="Size"
        value={style.fontSize}
        min={12}
        max={22}
        onChange={(v) => onChange({ ...style, fontSize: v })}
      />
      <RangeRow
        label="Padding"
        value={style.paddingY}
        min={6}
        max={24}
        onChange={(v) =>
          onChange({
            ...style,
            paddingY: v,
            paddingX: Math.max(style.paddingX, Math.round(v * 1.4)),
          })
        }
      />

      {mode === "submit" ? (
        <>
          <div>
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Button width
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ["full", "Full width"],
                  ["half", "50%"],
                ] as const
              ).map(([value, label]) => {
                const active = style.width === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ ...style, width: value })}
                    className={`rounded-lg border px-2.5 py-2 text-[12.5px] font-semibold transition ${
                      active
                        ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                        : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[11.5px] font-semibold text-muted">
              Button alignment
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["left", "Left"],
                  ["center", "Center"],
                  ["right", "Right"],
                ] as const
              ).map(([value, label]) => {
                const active = style.alignment === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ ...style, alignment: value })}
                    className={`rounded-lg border px-2.5 py-2 text-[12.5px] font-semibold transition ${
                      active
                        ? "border-brand bg-[rgba(255,102,0,.1)] text-brand"
                        : "border-[#dbe1ea] text-muted hover:border-brand hover:text-brand"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ToneEditor({
  tones,
  onChange,
}: {
  tones: FormTheme["validation"];
  onChange: (t: FormTheme["validation"]) => void;
}) {
  return (
    <>
      {(["success", "warning", "error", "info"] as const).map((key) => (
        <div key={key} className="flex flex-col gap-2 rounded-md border border-[#eef1f6] p-2">
          <p className="text-[11px] font-semibold tracking-wide text-faint uppercase">
            {key}
          </p>
          <ColorRow
            label="Color"
            value={tones[key].color}
            onChange={(v) =>
              onChange({ ...tones, [key]: { ...tones[key], color: v } })
            }
          />
          <ColorRow
            label="Background"
            value={tones[key].background}
            onChange={(v) =>
              onChange({ ...tones, [key]: { ...tones[key], background: v } })
            }
          />
          <ColorRow
            label="Border"
            value={tones[key].borderColor}
            onChange={(v) =>
              onChange({ ...tones, [key]: { ...tones[key], borderColor: v } })
            }
          />
        </div>
      ))}
    </>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)
    ? value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value.slice(0, 7)
    : "#ff6600";

  return (
    <label className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] font-semibold text-muted">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-8 cursor-pointer rounded border border-[#dbe1ea] bg-white p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[5.5rem] rounded-md border border-[#dbe1ea] px-1.5 py-1 font-mono text-[11px] outline-none focus:border-brand"
        />
      </span>
    </label>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[11.5px] font-semibold text-muted">
        <span>{label}</span>
        <span className="font-mono text-faint">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-brand,#ff6600)]"
      />
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[] | [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextRow({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-muted">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#dbe1ea] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand"
      />
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[11.5px] font-semibold text-muted">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--color-brand,#ff6600)]"
      />
    </label>
  );
}
