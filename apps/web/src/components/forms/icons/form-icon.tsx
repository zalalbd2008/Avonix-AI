"use client";

import type { CSSProperties } from "react";
import { ICON_PATHS } from "./paths";
import type { IconName } from "./registry";

const SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type FormIconSize = keyof typeof SIZES | number;

type Props = {
  name: IconName;
  size?: FormIconSize;
  className?: string;
  /** Overrides currentColor when set. */
  color?: string;
  title?: string;
  /** Decorative vs meaningful for a11y. */
  decorative?: boolean;
};

/**
 * Form builder SVG icon — stroke-based, currentColor for light/dark.
 */
export function FormIcon({
  name,
  size = "md",
  className,
  color,
  title,
  decorative = true,
}: Props) {
  const px = typeof size === "number" ? size : SIZES[size];
  const paths = ICON_PATHS[name];
  if (!paths) return null;

  const style: CSSProperties | undefined = color ? { color } : undefined;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={decorative && !title ? true : undefined}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      {paths}
    </svg>
  );
}
