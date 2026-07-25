"use client";

import { useEffect, useState, useTransition } from "react";
import { GoogleFontPicker } from "@/components/fonts/google-font-picker";
import { actionSaveWebsiteFonts } from "@/lib/websites/settings-actions";
import type { WebsiteFontSettings } from "@/lib/db/schema/websites";
import { googleFontsCssUrl } from "@/lib/fonts/google";

export function WebsiteFontsPanel({
  websiteId,
  clientId,
  initial,
}: {
  websiteId: string;
  clientId: string;
  initial?: WebsiteFontSettings | null;
}) {
  const [fonts, setFonts] = useState<WebsiteFontSettings>({
    primaryFamily: initial?.primaryFamily || "system",
    headingFamily: initial?.headingFamily || "",
    weights: initial?.weights || [400, 500, 600, 700],
  });
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const previewUrl = googleFontsCssUrl(
    [fonts.primaryFamily, fonts.headingFamily],
    fonts.weights,
  );

  useEffect(() => {
    if (!previewUrl) return;
    const id = "avonix-website-gfont-preview";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = previewUrl;
  }, [previewUrl]);

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-line bg-white">
      <h2 className="border-b border-[#edf0f5] px-4 py-3 text-sm font-semibold">
        Fonts
      </h2>
      <div className="space-y-4 px-4 py-4">
        <p className="text-[12px] leading-relaxed text-muted">
          Choose fonts for this website. Popups and forms can override them.
        </p>
        <GoogleFontPicker
          label="Primary (body) font"
          value={fonts.primaryFamily || "system"}
          onChange={(family) =>
            setFonts((f) => ({ ...f, primaryFamily: family }))
          }
        />
        <GoogleFontPicker
          label="Heading font"
          value={fonts.headingFamily || fonts.primaryFamily || "system"}
          onChange={(family) =>
            setFonts((f) => ({ ...f, headingFamily: family }))
          }
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-brand px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
            onClick={() => {
              setMsg(null);
              start(async () => {
                const res = await actionSaveWebsiteFonts({
                  websiteId,
                  clientId,
                  fonts,
                });
                setMsg(res.ok ? "Saved." : res.error);
              });
            }}
          >
            {pending ? "Saving…" : "Save fonts"}
          </button>
          {msg ? (
            <span className="text-[12px] text-muted">{msg}</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
