"use client";

import { popupCloseGlyph } from "@/lib/popup/defaults";

/** SVG close mark — optically centered (text × sits off-center in most fonts). */
export function PopupCloseIcon({
  icon,
  className,
}: {
  icon?: import("@/lib/db/schema").PopupTheme["closeIcon"];
  className?: string;
}) {
  const kind = icon ?? "x";
  if (kind === "plus" || kind === "circle_x") {
    return (
      <span
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          lineHeight: 1,
          fontWeight: 700,
          fontSize: "0.55em",
        }}
      >
        {popupCloseGlyph(kind)}
      </span>
    );
  }
  const stroke = kind === "x_bold" ? 2.6 : 2.2;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
      style={{
        display: "block",
        width: "52%",
        height: "52%",
        flexShrink: 0,
      }}
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
    </svg>
  );
}
