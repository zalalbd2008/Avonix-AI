"use client";

import type { CSSProperties } from "react";
import type { PopupComponent, PopupPayload } from "@/lib/db/schema";
import { googleFontStack } from "@/lib/fonts/google";
import { isSafeEmbedUrl } from "@/lib/popup/resolve-form-link";
import { PopupCloseIcon } from "@/components/popup/popup-close-icon";
import { PopupFormPreviewBlock } from "@/components/popup/popup-form-preview-block";

type FormOpt = { id: string; name: string };

function PreviewComponents({ list }: { list: PopupComponent[] }) {
  return (
    <>
      {list.map((c) => (
        <PreviewNode key={c.id} component={c} />
      ))}
    </>
  );
}

function PreviewNode({ component: c }: { component: PopupComponent }) {
  const props = c.props ?? {};
  if (c.kind === "columns") {
    const count = Number(props.count ?? c.children?.length ?? 2);
    return (
      <div
        className="w-full"
        style={{
          display: "grid",
          gap: Number(props.gap ?? 12),
          gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
        }}
      >
        {(c.children ?? []).map((col) => (
          <div key={col.id} className="min-w-0 space-y-1.5">
            <PreviewComponents list={col.children ?? []} />
          </div>
        ))}
      </div>
    );
  }
  if (c.kind === "column") {
    return <PreviewComponents list={c.children ?? []} />;
  }
  if (c.kind === "divider") {
    return <div className="border-t border-black/10" />;
  }
  if (c.kind === "spacer") {
    return <div style={{ height: Number(props.height) || 12 }} />;
  }
  if (c.kind === "image" && props.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={String(props.src)}
        alt=""
        className="max-h-20 w-full rounded object-cover"
      />
    );
  }
  if (c.kind === "headline") {
    return (
      <p className="text-[13px] font-bold opacity-90">
        {String(props.text || "Headline")}
      </p>
    );
  }
  if (c.kind === "paragraph") {
    return (
      <p className="text-[11px] opacity-70">{String(props.text || "")}</p>
    );
  }
  return (
    <p className="text-[11px] opacity-70">
      {String(props.text || props.label || c.kind.replace(/_/g, " "))}
    </p>
  );
}

function FormSlot({
  payload,
  formOptions,
  clientId,
  websiteId,
}: {
  payload: PopupPayload;
  formOptions: FormOpt[];
  clientId?: string;
  websiteId?: string;
}) {
  const formId = payload.content.formId;
  if (formId && clientId && websiteId) {
    return (
      <PopupFormPreviewBlock
        clientId={clientId}
        websiteId={websiteId}
        formId={formId}
        formName={formOptions.find((f) => f.id === formId)?.name}
        hideSubmit={Boolean(payload.content.replaceFormButtons)}
      />
    );
  }
  if (formId) {
    return (
      <div className="rounded-lg border border-dashed border-brand/30 bg-black/5 px-3 py-4 text-center text-[11px] opacity-80">
        Form ·{" "}
        <span className="font-semibold">
          {formOptions.find((f) => f.id === formId)?.name ?? "Selected form"}
        </span>
      </div>
    );
  }
  if (
    payload.content.formEmbedUrl &&
    isSafeEmbedUrl(payload.content.formEmbedUrl)
  ) {
    return (
      <div className="overflow-hidden rounded-lg border border-black/10">
        <iframe
          title="Form preview"
          src={payload.content.formEmbedUrl}
          className="h-40 w-full bg-white"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-amber-400/50 bg-amber-50 px-3 py-4 text-center text-[11px] text-amber-900">
      No form selected — open Content tab → Select existing form
    </div>
  );
}

export function PopupLivePreview({
  payload,
  formOptions = [],
  clientId,
  websiteId,
  onClose,
}: {
  payload: PopupPayload;
  formOptions?: FormOpt[];
  clientId?: string;
  websiteId?: string;
  /** Close (×) button — closes studio preview / dismisses overlay. */
  onClose?: () => void;
}) {
  const grid = payload.design.grid ?? { mode: "stack", align: "left" };
  const theme = payload.design.theme ?? {};
  const mode = grid.mode ?? "stack";
  const align = grid.align ?? "left";
  const mediaPct = grid.mediaWidthPercent ?? 48;
  const mediaSide = grid.mediaSide ?? "left";
  const colCount = grid.columnCount ?? 2;

  const hasColoredHeader =
    mode === "header_band" || Boolean(theme.headerBackgroundColor);

  const cardStyle: CSSProperties = {
    borderRadius: payload.design.radius ?? 18,
    maxWidth:
      mode === "multi_column"
        ? (payload.design.maxWidth ?? 700)
        : (payload.design.maxWidth ?? 550),
    maxHeight: "min(85vh, 720px)",
    minHeight: payload.design.minHeight,
    padding:
      mode === "media_split" || hasColoredHeader
        ? 0
        : (payload.design.padding ?? 20),
    background:
      mode === "banner_split"
        ? `linear-gradient(180deg, ${theme.splitTopColor ?? "#0b1220"} 50%, ${theme.splitBottomColor ?? "#c9a227"} 50%)`
        : (theme.backgroundColor ?? "#ffffff"),
    color: theme.textColor ?? "#0f1c2e",
    boxShadow:
      payload.design.shadow === false
        ? undefined
        : "0 1px 2px rgba(15,23,42,0.04), 0 24px 64px rgba(15,23,42,0.22)",
    overflow: "hidden",
    position: "relative",
    width: "100%",
    border: "1px solid rgba(15,23,42,0.06)",
    display: "flex",
    flexDirection: mode === "media_split" ? "row" : "column",
    scrollbarWidth: "none",
  };

  const textAlign = align as CSSProperties["textAlign"];

  function textStyle(
    style: PopupPayload["content"]["headlineStyle"],
    defaults: {
      fontSize: number;
      fontWeight: number;
      color: string;
      fontFamily?: string;
    },
  ): CSSProperties {
    return {
      fontSize: style?.fontSize ?? defaults.fontSize,
      fontWeight: style?.fontWeight ?? defaults.fontWeight,
      color: style?.color ?? defaults.color,
      textAlign: style?.align ?? align,
      fontFamily: googleFontStack(
        style?.fontFamily ||
          defaults.fontFamily ||
          payload.design.headingFont ||
          payload.design.googleFont,
      ),
      lineHeight: style?.lineHeight ?? 1.25,
      letterSpacing:
        style?.letterSpacing != null ? `${style.letterSpacing}px` : undefined,
      textTransform: style?.textTransform ?? "none",
      margin: 0,
    };
  }

  const componentsBlock =
    (payload.components ?? []).length > 0 ? (
      <div
        className="w-full"
        style={
          mode === "multi_column"
            ? {
                display: "grid",
                gap: grid.gap ?? 12,
                gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
              }
            : undefined
        }
      >
        {mode === "multi_column" ? (
          (payload.components ?? []).map((c) =>
            c.kind === "columns" ? (
              <div key={c.id} className="col-span-full w-full">
                <PreviewNode component={c} />
              </div>
            ) : (
              <div key={c.id}>
                <PreviewNode component={c} />
              </div>
            ),
          )
        ) : (
          <PreviewComponents list={payload.components ?? []} />
        )}
      </div>
    ) : null;

  const formSlot = (
    <FormSlot
      payload={payload}
      formOptions={formOptions}
      clientId={clientId}
      websiteId={websiteId}
    />
  );

  const body = (
    <div
      className="avx-popup-preview-body"
      style={{
        padding:
          mode === "media_split" || hasColoredHeader
            ? (payload.design.padding ?? (hasColoredHeader ? 18 : 28))
            : undefined,
        textAlign,
        display: "flex",
        flexDirection: "column",
        gap: grid.gap ?? 12,
        justifyContent: "flex-start",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        background: hasColoredHeader
          ? (theme.backgroundColor ?? "#fff")
          : undefined,
      }}
    >
      <style>{`
        .avx-popup-preview-shell,
        .avx-popup-preview-body {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .avx-popup-preview-shell::-webkit-scrollbar,
        .avx-popup-preview-body::-webkit-scrollbar,
        .avx-popup-preview-shell *::-webkit-scrollbar,
        .avx-popup-preview-body *::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
          background: transparent !important;
        }
      `}</style>
      {!hasColoredHeader && payload.content.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={payload.content.logoUrl}
          alt=""
          className="mx-auto mb-1 max-h-8 object-contain"
          style={{
            marginLeft: align === "center" ? "auto" : undefined,
            marginRight: align === "center" ? "auto" : undefined,
          }}
        />
      ) : null}
      {mode === "stack" && !hasColoredHeader && payload.content.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={payload.content.imageUrl}
          alt=""
          className="mb-1 max-h-28 w-full rounded-lg object-cover"
        />
      ) : null}
      {!hasColoredHeader ? (
        <>
          <p
            style={textStyle(payload.content.headlineStyle, {
              fontSize: 20,
              fontWeight: 700,
              color: theme.textColor ?? "#13233c",
              fontFamily: payload.design.headingFont || payload.design.googleFont,
            })}
          >
            {payload.content.headline || "Headline"}
          </p>
          {payload.content.description ? (
            <p
              style={textStyle(payload.content.descriptionStyle, {
                fontSize: 14,
                fontWeight: 400,
                color: "#5b6b7c",
                fontFamily: payload.design.googleFont,
              })}
            >
              {payload.content.description}
            </p>
          ) : null}
        </>
      ) : null}
      {formSlot}
      {componentsBlock}
      {payload.content.couponCode ? (
        <p
          className="text-[13px] font-bold"
          style={{ textAlign, color: theme.textColor ?? "#13233c" }}
        >
          {payload.content.discountLabel
            ? `${payload.content.discountLabel}: `
            : ""}
          {payload.content.couponCode}
        </p>
      ) : null}
      {((!payload.content.formId && !payload.content.formEmbedUrl) ||
        payload.content.replaceFormButtons) && (
        <button
          type="button"
          className="w-full shrink-0 font-semibold"
          style={{
            background: theme.buttonBackground ?? "#ff6600",
            color: theme.buttonTextColor ?? "#fff",
            borderRadius: theme.buttonRadius ?? 10,
            border: theme.buttonBorderColor
              ? `2px solid ${theme.buttonBorderColor}`
              : "0",
            height: theme.buttonHeight ?? 44,
            fontSize: theme.buttonFontSize ?? 14,
            padding: 0,
            lineHeight: 1,
          }}
        >
          {payload.content.primaryCta?.label || "Continue"}
        </button>
      )}
      {payload.content.secondaryCta?.label ? (
        <button
          type="button"
          className="text-[12px] underline"
          style={{
            color: theme.secondaryLinkColor ?? "#444",
            background: "transparent",
            border: 0,
            cursor: "pointer",
            alignSelf:
              align === "center"
                ? "center"
                : align === "right"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          {payload.content.secondaryCta.label}
        </button>
      ) : null}
    </div>
  );

  if (mode === "media_split") {
    const media = (
      <div
        style={{
          flex: `0 0 ${mediaPct}%`,
          background:
            theme.mediaBackgroundColor ||
            theme.backgroundColor ||
            "#e8e4ef",
          minHeight: payload.design.minHeight ?? 280,
          backgroundImage: payload.content.imageUrl
            ? `url(${payload.content.imageUrl})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    );
    return (
      <div
        className="avx-popup-preview-shell flex overflow-hidden"
        style={{
          ...cardStyle,
          flexDirection: mediaSide === "right" ? "row-reverse" : "row",
        }}
      >
        <CloseBtn />
        {media}
        {body}
      </div>
    );
  }

  function CloseBtn() {
    if (payload.close?.showCloseButton === false) return null;
    const size = theme.closeSize ?? 30;
    const anim = theme.closeAnimation ?? "none";
    const hover = theme.closeHoverAnimation ?? "scale";
    const hoverClass =
      hover === "scale"
        ? "hover:scale-110"
        : hover === "rotate"
          ? "hover:rotate-90"
          : hover === "spin"
            ? "hover:animate-spin"
            : hover === "pulse"
              ? "hover:animate-pulse"
              : "";
    const idleClass =
      anim === "spin"
        ? "animate-spin"
        : anim === "pulse"
          ? "animate-pulse"
          : anim === "bounce"
            ? "animate-bounce"
            : anim === "fade"
              ? "animate-[fadeIn_0.4s_ease]"
              : "";
    return (
      <button
        type="button"
        aria-label="Close"
        className={`absolute right-3 top-3 z-10 inline-flex items-center justify-center overflow-hidden rounded-full font-semibold leading-none transition ${idleClass} ${hoverClass}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          maxWidth: size,
          maxHeight: size,
          borderRadius: "50%",
          aspectRatio: "1 / 1",
          padding: 0,
          fontSize: size,
          lineHeight: 0,
          background: theme.closeBackground ?? "#ef4444",
          color: theme.closeColor ?? "#fff",
          border: 0,
          cursor: "pointer",
          ["--avx-close-hover-bg" as string]:
            theme.closeHoverBackground ?? theme.closeBackground ?? "#dc2626",
          ["--avx-close-hover-fg" as string]:
            theme.closeHoverColor ?? theme.closeColor ?? "#fff",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          if (theme.closeHoverBackground) {
            el.style.background = theme.closeHoverBackground;
          }
          if (theme.closeHoverColor) el.style.color = theme.closeHoverColor;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.background = theme.closeBackground ?? "#ef4444";
          el.style.color = theme.closeColor ?? "#fff";
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose?.();
        }}
      >
        <PopupCloseIcon icon={theme.closeIcon} />
      </button>
    );
  }

  if (mode === "header_band" || hasColoredHeader) {
    const headerBg =
      mode === "header_band"
        ? `linear-gradient(90deg, ${theme.splitTopColor ?? theme.headerBackgroundColor ?? "#1e1b4b"} 0%, ${theme.splitBottomColor ?? theme.headerBackgroundColor ?? "#7c3aed"} 100%)`
        : (theme.headerBackgroundColor as string);
    return (
      <div className="avx-popup-preview-shell" style={cardStyle}>
        <CloseBtn />
        <div
          style={{
            padding: "20px 22px 18px",
            textAlign,
            background: headerBg,
            flexShrink: 0,
          }}
        >
          {payload.content.scarcityText ? (
            <span
              className="mb-3 inline-block rounded-full px-2.5 py-1 text-[9px] font-bold tracking-[0.07em] text-white uppercase"
              style={{ background: "rgba(15,23,42,0.42)" }}
            >
              {payload.content.scarcityText}
            </span>
          ) : null}
          <p
            style={textStyle(payload.content.headlineStyle, {
              fontSize: 22,
              fontWeight: 700,
              color: "#0f172a",
              fontFamily: payload.design.headingFont || payload.design.googleFont,
            })}
          >
            {payload.content.headline || "New Campaign Heading"}
          </p>
          {payload.content.description ? (
            <p
              className="mt-2"
              style={textStyle(payload.content.descriptionStyle, {
                fontSize: 13,
                fontWeight: 400,
                color: "#ffffff",
                fontFamily: payload.design.googleFont,
              })}
            >
              {payload.content.description}
            </p>
          ) : null}
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="avx-popup-preview-shell" style={cardStyle}>
      <CloseBtn />
      {body}
    </div>
  );
}
