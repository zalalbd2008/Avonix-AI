"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CepWidgetPayload } from "@/lib/db/schema";
import type { CepIndustryExperience, IndustryFamily } from "@/lib/cep/industry-presets/types";
import {
  actionApplyIndustryPreset,
  actionAutoSelectIndustryPreset,
  actionDetectSiteBrand,
  actionExportIndustryPresetJson,
  actionImportIndustryPresetJson,
  actionListIndustryPresets,
} from "@/lib/cep/industry-preset-actions";

const input =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

type CatalogItem = {
  id: string;
  family: IndustryFamily;
  industryName: string;
  catalogBlurb: string;
  designPersonality: string;
  assistantName: string;
  colors: {
    primary: string;
    primaryEnd: string;
    background: string;
    header: string;
  };
  businessGoal: string;
  conversionGoal: string;
};

type DetectedBrandSummary = {
  businessName: string | null;
  brandColors: string[];
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  services: string[];
  primaryCta: string | null;
  hasBooking: boolean;
  crawledPages: number;
  socialLinks: Array<{ network: string; url: string }>;
  faqs: Array<{ q: string; a: string }>;
};

export function IndustryPresetPanel({
  websiteId,
  payload,
  onApplyPayload,
}: {
  websiteId: string;
  payload: CepWidgetPayload;
  onApplyPayload: (next: CepWidgetPayload) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [family, setFamily] = useState<"all" | IndustryFamily>("all");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [brand, setBrand] = useState<DetectedBrandSummary | null>(null);
  const [matches, setMatches] = useState<
    Array<{ id: string; score: number; name: string }>
  >([]);
  const [importText, setImportText] = useState("");
  const [expDraft, setExpDraft] = useState<CepIndustryExperience | null>(
    payload.experience ?? null,
  );
  const [section, setSection] = useState<
    "library" | "detect" | "edit" | "io"
  >("library");

  const filtered = useMemo(() => {
    if (!catalog) return [];
    if (family === "all") return catalog;
    return catalog.filter((c) => c.family === family);
  }, [catalog, family]);

  function loadCatalog() {
    setError(null);
    startTransition(async () => {
      const rows = await actionListIndustryPresets();
      setCatalog(rows);
    });
  }

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  useEffect(() => {
    if (payload.experience) setExpDraft(payload.experience);
  }, [payload.experience]);

  function applyPreset(presetId: string, detectAndCustomize: boolean) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await actionApplyIndustryPreset({
        websiteId,
        presetId: presetId as never,
        payload,
        detectAndCustomize,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onApplyPayload(res.payload);
      setExpDraft(res.payload.experience ?? null);
      if (res.brand) {
        setBrand({
          businessName: res.brand.businessName,
          brandColors: res.brand.brandColors,
          logoUrl: res.brand.logoUrl,
          phone: res.brand.phone,
          email: res.brand.email,
          address: res.brand.address,
          services: res.brand.services,
          primaryCta: res.brand.primaryCta,
          hasBooking: res.brand.hasBooking,
          crawledPages: res.brand.crawledPages,
          socialLinks: res.brand.socialLinks,
          faqs: res.brand.faqs,
        });
      }
      setNotice(
        detectAndCustomize
          ? `Applied “${res.presetName}” and customized from site crawl.`
          : `Applied “${res.presetName}” preset (library design preserved).`,
      );
    });
  }

  function autoSelect() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await actionAutoSelectIndustryPreset({
        websiteId,
        payload,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onApplyPayload(res.payload);
      setExpDraft(res.payload.experience ?? null);
      setBrand({
        businessName: res.brand.businessName,
        brandColors: res.brand.brandColors,
        logoUrl: res.brand.logoUrl,
        phone: res.brand.phone,
        email: res.brand.email,
        address: res.brand.address,
        services: res.brand.services,
        primaryCta: res.brand.primaryCta,
        hasBooking: res.brand.hasBooking,
        crawledPages: res.brand.crawledPages,
        socialLinks: res.brand.socialLinks,
        faqs: res.brand.faqs,
      });
      setMatches(res.matches);
      setNotice(
        `Matched “${res.presetName}” from site crawl · customized preset (not redesigned).`,
      );
      setSection("detect");
    });
  }

  function detectOnly() {
    setError(null);
    startTransition(async () => {
      const res = await actionDetectSiteBrand({ websiteId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBrand({
        businessName: res.brand.businessName,
        brandColors: res.brand.brandColors,
        logoUrl: res.brand.logoUrl,
        phone: res.brand.phone,
        email: res.brand.email,
        address: res.brand.address,
        services: res.brand.services,
        primaryCta: res.brand.primaryCta,
        hasBooking: res.brand.hasBooking,
        crawledPages: res.brand.crawledPages,
        socialLinks: res.brand.socialLinks,
        faqs: res.brand.faqs,
      });
      setMatches(res.matches);
      setSection("detect");
    });
  }

  function commitExperienceEdits() {
    if (!expDraft) return;
    onApplyPayload({
      ...payload,
      industryPresetId: expDraft.industryPresetId,
      experience: expDraft,
      title: expDraft.assistantName,
      greeting: expDraft.greeting,
      theme: {
        ...payload.theme,
        primaryColor: expDraft.colorPalette.primary,
        primaryColorEnd: expDraft.colorPalette.primaryEnd,
        backgroundColor: expDraft.colorPalette.background,
        textColor: expDraft.colorPalette.text,
        headerColor: expDraft.colorPalette.header,
        agentName: expDraft.assistantName,
        statusText: expDraft.assistantRole,
        homeContent: expDraft.greeting,
        launcherLabel: expDraft.bubbleCta,
        disclaimer: expDraft.footer,
      },
      ai: {
        ...payload.ai,
        systemPromptOverride: expDraft.aiPrompt,
      },
      quickReplies: expDraft.quickActionGrid.slice(0, 6).map((q) => ({
        id: q.id,
        label: q.label,
        icon: q.icon,
        action: q.action,
        value: q.value,
      })),
    });
    setNotice("Experience edits applied to widget (save to persist).");
  }

  function exportJson() {
    setError(null);
    startTransition(async () => {
      const res = await actionExportIndustryPresetJson({ payload });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setImportText(res.json);
      try {
        await navigator.clipboard.writeText(res.json);
        setNotice("Preset JSON copied to clipboard.");
      } catch {
        setNotice("Preset JSON ready below — copy manually.");
      }
      setSection("io");
    });
  }

  function importJson() {
    setError(null);
    startTransition(async () => {
      const res = await actionImportIndustryPresetJson({
        json: importText,
        payload,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onApplyPayload(res.payload);
      setExpDraft(res.payload.experience ?? null);
      setNotice("Imported industry preset JSON (save to persist).");
    });
  }

  const activeId = payload.industryPresetId ?? null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-faint">
          Enterprise Industry Preset Library
        </p>
        <p className="mt-1 text-[13px] text-muted">
          AI customizes a professional industry preset — it never invents a
          widget design from scratch. Every section below is editable and
          exportable as JSON.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["library", "Library"],
            ["detect", "Detect & match"],
            ["edit", "Edit experience"],
            ["io", "Import / Export"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold ${
              section === id
                ? "bg-brand text-white"
                : "bg-[#eef2f7] text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
          {notice}
        </p>
      ) : null}

      {activeId ? (
        <p className="text-[12px] text-muted">
          Active preset:{" "}
          <span className="font-semibold text-ink">
            {payload.experience?.industryName ?? activeId}
          </span>
        </p>
      ) : (
        <p className="text-[12px] text-faint">No industry preset applied yet.</p>
      )}

      {section === "library" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={`${input} max-w-[220px]`}
              value={family}
              onChange={(e) => setFamily(e.target.value as typeof family)}
            >
              <option value="all">All industries</option>
              <option value="healthcare">Healthcare</option>
              <option value="creative_marketing">Creative & Marketing</option>
            </select>
            <button
              type="button"
              disabled={pending}
              onClick={autoSelect}
              className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {pending ? "Working…" : "Crawl site → auto apply"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={loadCatalog}
              className="rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-ink hover:bg-[#f8fafc] disabled:opacity-60"
            >
              Refresh library
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <div
                key={p.id}
                className={`rounded-xl border p-3 ${
                  activeId === p.id
                    ? "border-brand bg-brand/5"
                    : "border-line bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-0.5 h-8 w-8 shrink-0 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${p.colors.primary}, ${p.colors.primaryEnd})`,
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink">
                      {p.industryName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {p.designPersonality}
                    </p>
                    <p className="mt-1 text-[12px] text-muted">{p.catalogBlurb}</p>
                    <p className="mt-1 text-[11px] text-faint">
                      Assistant: {p.assistantName}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => applyPreset(p.id, false)}
                    className="rounded-md bg-[#0b1e3a] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60"
                  >
                    Apply preset
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => applyPreset(p.id, true)}
                    className="rounded-md border border-line px-2.5 py-1.5 text-[11px] font-semibold text-ink hover:bg-[#f8fafc] disabled:opacity-60"
                  >
                    Apply + customize from site
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!catalog?.length && pending ? (
            <p className="text-[12px] text-faint">Loading presets…</p>
          ) : null}
        </div>
      ) : null}

      {section === "detect" ? (
        <div className="space-y-3">
          <button
            type="button"
            disabled={pending}
            onClick={detectOnly}
            className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {pending ? "Crawling…" : "Crawl & detect brand signals"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={autoSelect}
            className="ml-2 rounded-lg border border-line px-3 py-2 text-[12px] font-semibold text-ink hover:bg-[#f8fafc] disabled:opacity-60"
          >
            Detect + auto-apply best preset
          </button>

          {brand ? (
            <div className="rounded-xl border border-line bg-[#f8fafc] p-3 text-[12px]">
              <p className="font-semibold text-ink">Detected signals</p>
              <ul className="mt-2 space-y-1 text-muted">
                <li>Business: {brand.businessName || "—"}</li>
                <li>Phone: {brand.phone || "—"}</li>
                <li>Email: {brand.email || "—"}</li>
                <li>Address: {brand.address || "—"}</li>
                <li>Primary CTA: {brand.primaryCta || "—"}</li>
                <li>Booking language: {brand.hasBooking ? "Yes" : "No"}</li>
                <li>Pages crawled: {brand.crawledPages}</li>
                <li>
                  Services:{" "}
                  {brand.services.length ? brand.services.join(", ") : "—"}
                </li>
                <li>
                  Colors:{" "}
                  {brand.brandColors.length ? (
                    <span className="inline-flex gap-1 align-middle">
                      {brand.brandColors.map((c) => (
                        <span
                          key={c}
                          title={c}
                          className="inline-block h-3.5 w-3.5 rounded-sm border border-black/10"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                  ) : (
                    "—"
                  )}
                </li>
                <li>
                  Social:{" "}
                  {brand.socialLinks.length
                    ? brand.socialLinks.map((s) => s.network).join(", ")
                    : "—"}
                </li>
                <li>FAQs found: {brand.faqs.length}</li>
                {brand.logoUrl ? (
                  <li className="truncate">Logo: {brand.logoUrl}</li>
                ) : null}
              </ul>
            </div>
          ) : (
            <p className="text-[12px] text-faint">
              Run detection to extract category, colors, logo, contacts, CTAs,
              FAQs, and booking signals.
            </p>
          )}

          {matches.length ? (
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-ink">
                Best preset matches
              </p>
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2"
                >
                  <span className="text-[12px] text-ink">
                    {m.name}{" "}
                    <span className="text-faint">(score {m.score})</span>
                  </span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => applyPreset(m.id, true)}
                    className="text-[11px] font-semibold text-brand"
                  >
                    Apply + customize
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {section === "edit" ? (
        <div className="space-y-3">
          {!expDraft ? (
            <p className="text-[12px] text-faint">
              Apply a preset first, then edit every experience section here.
            </p>
          ) : (
            <>
              <Field
                label="Assistant name"
                value={expDraft.assistantName}
                onChange={(v) =>
                  setExpDraft({ ...expDraft, assistantName: v })
                }
              />
              <Field
                label="Assistant role"
                value={expDraft.assistantRole}
                onChange={(v) =>
                  setExpDraft({ ...expDraft, assistantRole: v })
                }
              />
              <Area
                label="Greeting"
                value={expDraft.greeting}
                onChange={(v) => setExpDraft({ ...expDraft, greeting: v })}
              />
              <Area
                label="AI prompt context"
                value={expDraft.aiPrompt}
                onChange={(v) => setExpDraft({ ...expDraft, aiPrompt: v })}
              />
              <Area
                label="Suggested questions (one per line)"
                value={expDraft.suggestedQuestions.join("\n")}
                onChange={(v) =>
                  setExpDraft({
                    ...expDraft,
                    suggestedQuestions: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Area
                label="Quick actions (label per line — keeps icons/actions)"
                value={expDraft.quickActionGrid.map((q) => q.label).join("\n")}
                onChange={(v) => {
                  const labels = v
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean);
                  setExpDraft({
                    ...expDraft,
                    quickActionGrid: expDraft.quickActionGrid.map((q, i) =>
                      labels[i] ? { ...q, label: labels[i], value: labels[i] } : q,
                    ),
                  });
                }}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Primary CTA"
                  value={expDraft.primaryCta.label}
                  onChange={(v) =>
                    setExpDraft({
                      ...expDraft,
                      primaryCta: { ...expDraft.primaryCta, label: v },
                    })
                  }
                />
                <Field
                  label="Secondary CTA"
                  value={expDraft.secondaryCta.label}
                  onChange={(v) =>
                    setExpDraft({
                      ...expDraft,
                      secondaryCta: { ...expDraft.secondaryCta, label: v },
                    })
                  }
                />
                <Field
                  label="Bubble CTA"
                  value={expDraft.bubbleCta}
                  onChange={(v) => setExpDraft({ ...expDraft, bubbleCta: v })}
                />
                <Field
                  label="Primary color"
                  value={expDraft.colorPalette.primary}
                  onChange={(v) =>
                    setExpDraft({
                      ...expDraft,
                      colorPalette: { ...expDraft.colorPalette, primary: v },
                    })
                  }
                />
              </div>
              <Area
                label="Footer"
                value={expDraft.footer}
                onChange={(v) => setExpDraft({ ...expDraft, footer: v })}
              />
              <Area
                label="Lead capture strategy"
                value={expDraft.leadCaptureStrategy}
                onChange={(v) =>
                  setExpDraft({ ...expDraft, leadCaptureStrategy: v })
                }
              />
              <Area
                label="Sales conversation flow"
                value={expDraft.salesConversationFlow}
                onChange={(v) =>
                  setExpDraft({ ...expDraft, salesConversationFlow: v })
                }
              />
              <Area
                label="Human handoff rules (one per line)"
                value={expDraft.humanHandoffRules.join("\n")}
                onChange={(v) =>
                  setExpDraft({
                    ...expDraft,
                    humanHandoffRules: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Area
                label="Trust badges (one per line)"
                value={expDraft.trustBadges.join("\n")}
                onChange={(v) =>
                  setExpDraft({
                    ...expDraft,
                    trustBadges: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Area
                label="Follow-up sequence (one per line)"
                value={expDraft.followUpSequence.join("\n")}
                onChange={(v) =>
                  setExpDraft({
                    ...expDraft,
                    followUpSequence: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Area
                label="Follow-up logic"
                value={expDraft.followUpLogic}
                onChange={(v) =>
                  setExpDraft({ ...expDraft, followUpLogic: v })
                }
              />
              <Area
                label="Trigger rules (one per line)"
                value={expDraft.triggerRules.join("\n")}
                onChange={(v) =>
                  setExpDraft({
                    ...expDraft,
                    triggerRules: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Area
                label="Exit intent rules (one per line)"
                value={expDraft.exitIntentRules.join("\n")}
                onChange={(v) =>
                  setExpDraft({
                    ...expDraft,
                    exitIntentRules: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <Area
                label="Accessibility rules (one per line)"
                value={expDraft.accessibilityRules.join("\n")}
                onChange={(v) =>
                  setExpDraft({
                    ...expDraft,
                    accessibilityRules: v
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Area
                  label="Mobile notes"
                  value={expDraft.mobileNotes}
                  onChange={(v) =>
                    setExpDraft({ ...expDraft, mobileNotes: v })
                  }
                />
                <Area
                  label="Desktop notes"
                  value={expDraft.desktopNotes}
                  onChange={(v) =>
                    setExpDraft({ ...expDraft, desktopNotes: v })
                  }
                />
                <Area
                  label="Dark mode notes"
                  value={expDraft.darkModeNotes}
                  onChange={(v) =>
                    setExpDraft({ ...expDraft, darkModeNotes: v })
                  }
                />
                <Area
                  label="Illustration style"
                  value={expDraft.illustrationStyle}
                  onChange={(v) =>
                    setExpDraft({ ...expDraft, illustrationStyle: v })
                  }
                />
              </div>
              <button
                type="button"
                onClick={commitExperienceEdits}
                className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
              >
                Apply experience edits to widget
              </button>
            </>
          )}
        </div>
      ) : null}

      {section === "io" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={exportJson}
              className="rounded-lg bg-[#0b1e3a] px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              Export JSON
            </button>
            <button
              type="button"
              disabled={pending || !importText.trim()}
              onClick={importJson}
              className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              Import JSON
            </button>
          </div>
          <textarea
            className={`${input} min-h-[220px] font-mono text-[11px]`}
            placeholder="Paste avonix-cep-industry-preset JSON here…"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium">{label}</span>
      <input
        className={`${input} mt-1`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium">{label}</span>
      <textarea
        className={`${input} mt-1 min-h-[72px]`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
