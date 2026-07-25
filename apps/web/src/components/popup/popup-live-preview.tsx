"use client";

import type { CSSProperties } from "react";
import type { PopupComponent, PopupPayload } from "@/lib/db/schema";
import { googleFontStack } from "@/lib/fonts/google";
import { isSafeEmbedUrl } from "@/lib/popup/resolve-form-link";

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

export function PopupLivePreview({
  payload,
  formOptions = [],
}: {
  payload: PopupPayload;
  formOptions?: FormOpt[];
}) {
  const grid = payload.design.grid ?? { mode: "stack", align: "left" };
  const theme = payload.design.theme ?? {};
  const mode = grid.mode ?? "stack";
  const align = grid.align ?? "left";
  const mediaPct = grid.mediaWidthPercent ?? 48;
  const mediaSide = grid.mediaSide ?? "left";
  const colCount = grid.columnCount ?? 2;

  const cardStyle: CSSProperties = {
    borderRadius: payload.design.radius ?? 16,
    maxWidth:
      mode === "multi_column"
        ? (payload.design.maxWidth ?? 700)
        : (payload.design.maxWidth ?? 420),
    minHeight: payload.design.minHeight,
    padding: mode === "media_split" ? 0 : (payload.design.padding ?? 24),
    background:
      mode === "banner_split"
        ? `linear-gradient(180deg, ${theme.splitTopColor ?? "#0b1220"} 50%, ${theme.splitBottomColor ?? "#c9a227"} 50%)`
        : (theme.backgroundColor ?? "#ffffff"),
    color: theme.textColor ?? "#13233c",
    boxShadow:
      payload.design.shadow === false
        ? undefined
        : "0 20px 50px rgba(15,23,42,0.18)",
    overflow: "hidden",
    position: "relative",
    width: "100%",
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

  const body = (
    <div
      style={{
        padding:
          mode === "media_split" ? (payload.design.padding ?? 28) : undefined,
        textAlign,
        display: "flex",
        flexDirection: "column",
        gap: grid.gap ?? 12,
        justifyContent: "center",
        flex: 1,
        minWidth: 0,
        width: "100%",
      }}
    >
      {payload.content.logoUrl ? (
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
      {mode === "stack" && payload.content.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={payload.content.imageUrl}
          alt=""
          className="mb-1 max-h-28 w-full rounded-lg object-cover"
        />
      ) : null}
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
      {payload.content.formId ? (
        <div className="rounded-lg border border-dashed border-brand/30 bg-black/5 px-3 py-4 text-center text-[11px] opacity-80">
          Form ·{" "}
          <span className="font-semibold">
            {formOptions.find((f) => f.id === payload.content.formId)?.name ??
              "Selected form"}
          </span>
        </div>
      ) : payload.content.formEmbedUrl &&
        isSafeEmbedUrl(payload.content.formEmbedUrl) ? (
        <div className="overflow-hidden rounded-lg border border-black/10">
          <iframe
            title="Form preview"
            src={payload.content.formEmbedUrl}
            className="h-40 w-full bg-white"
            loading="lazy"
          />
        </div>
      ) : null}
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
          className="w-full py-2.5 text-[13px] font-semibold"
          style={{
            background: theme.buttonBackground ?? "#ff6600",
            color: theme.buttonTextColor ?? "#fff",
            borderRadius: theme.buttonRadius ?? 10,
            border: theme.buttonBorderColor
              ? `2px solid ${theme.buttonBorderColor}`
              : "0",
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
        className="flex overflow-hidden"
        style={{
          ...cardStyle,
          flexDirection: mediaSide === "right" ? "row-reverse" : "row",
        }}
      >
        {media}
        {body}
      </div>
    );
  }

  return <div style={cardStyle}>{body}</div>;
}
