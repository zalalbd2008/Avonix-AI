import type { ReactNode } from "react";

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-[15px] shrink-0"
      fill="none"
    >
      {children}
    </svg>
  );
}

/** Line icons for sidebar rows — keyed from `NavItem.icon`. */
export const navIcons = {
  home: (
    <Icon>
      <path d="M2.5 6.5 8 2.5l5.5 4V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V6.5Z" {...stroke} />
      <path d="M6 13.5v-4h4v4" {...stroke} />
    </Icon>
  ),
  rocket: (
    <Icon>
      <path d="M9.5 2.5c2.2 1.2 3.5 3.5 3.5 6.2 0 .8-.1 1.5-.3 2.2L8 14.5l-1.4-3.1L3.5 10l3.6-4.7c.7-.2 1.4-.3 2.2-.3.1 0 .2 0 .2 0Z" {...stroke} />
      <path d="M6.5 9.5 4 13.5M9.5 9.5l1.5 3.5" {...stroke} />
      <circle cx="9.2" cy="6.2" r="1" {...stroke} />
    </Icon>
  ),
  building: (
    <Icon>
      <path d="M3 13.5h10" {...stroke} />
      <path d="M4.5 13.5V3.5h7v10" {...stroke} />
      <path d="M6.5 5.5h1M8.5 5.5h1M6.5 7.5h1M8.5 7.5h1M6.5 9.5h1M8.5 9.5h1" {...stroke} />
    </Icon>
  ),
  card: (
    <Icon>
      <rect x="2" y="4" width="12" height="8" rx="1.2" {...stroke} />
      <path d="M2 7h12" {...stroke} />
      <path d="M4.5 10h3" {...stroke} />
    </Icon>
  ),
  users: (
    <Icon>
      <circle cx="6" cy="5.5" r="2" {...stroke} />
      <path d="M2.5 13c0-2 1.6-3.2 3.5-3.2S9.5 11 9.5 13" {...stroke} />
      <circle cx="11" cy="6" r="1.6" {...stroke} />
      <path d="M10 9.8c1.4.2 2.8 1.1 2.8 3.2" {...stroke} />
    </Icon>
  ),
  layout: (
    <Icon>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.2" {...stroke} />
      <path d="M2.5 6.5h11M7 6.5v7" {...stroke} />
    </Icon>
  ),
  store: (
    <Icon>
      <path d="M3 6.5 4 3.5h8l1 3" {...stroke} />
      <path d="M3 6.5h10v6.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6.5Z" {...stroke} />
      <path d="M6.5 9.5v4.5M9.5 9.5v4.5" {...stroke} />
    </Icon>
  ),
  layers: (
    <Icon>
      <path d="M8 2.5 13.5 5.5 8 8.5 2.5 5.5 8 2.5Z" {...stroke} />
      <path d="M2.5 8 8 11l5.5-3" {...stroke} />
      <path d="M2.5 10.5 8 13.5l5.5-3" {...stroke} />
    </Icon>
  ),
  overview: (
    <Icon>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.8" {...stroke} />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.8" {...stroke} />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.8" {...stroke} />
      <rect x="9" y="9" width="4.5" height="4.5" rx="0.8" {...stroke} />
    </Icon>
  ),
  globe: (
    <Icon>
      <circle cx="8" cy="8" r="5.5" {...stroke} />
      <path d="M2.5 8h11M8 2.5c1.8 1.8 2.7 3.6 2.7 5.5S9.8 11.7 8 13.5C6.2 11.7 5.3 9.9 5.3 8S6.2 4.3 8 2.5Z" {...stroke} />
    </Icon>
  ),
  chart: (
    <Icon>
      <path d="M2.5 13.5h11" {...stroke} />
      <path d="M4.5 13.5V8M8 13.5V4.5M11.5 13.5v-6" {...stroke} />
    </Icon>
  ),
  gear: (
    <Icon>
      <circle cx="8" cy="8" r="2.2" {...stroke} />
      <path
        d="M8 2.5v1.2M8 12.3v1.2M2.5 8h1.2M12.3 8h1.2M3.9 3.9l.85.85M11.25 11.25l.85.85M3.9 12.1l.85-.85M11.25 4.75l.85-.85"
        {...stroke}
      />
    </Icon>
  ),
  form: (
    <Icon>
      <rect x="3.5" y="2.5" width="9" height="11" rx="1.2" {...stroke} />
      <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" {...stroke} />
    </Icon>
  ),
  popup: (
    <Icon>
      <rect x="2.5" y="3.5" width="11" height="9" rx="1.2" {...stroke} />
      <path d="M2.5 6.5h11" {...stroke} />
    </Icon>
  ),
  button: (
    <Icon>
      <rect x="2.5" y="5.5" width="11" height="5" rx="2.5" {...stroke} />
    </Icon>
  ),
  chat: (
    <Icon>
      <path d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H6.5L3.5 13.5V4.5a1 1 0 0 1 1-1Z" {...stroke} />
    </Icon>
  ),
  bolt: (
    <Icon>
      <path d="M9 2.5 4.5 9h3.5L7 13.5 11.5 7H8L9 2.5Z" {...stroke} />
    </Icon>
  ),
  mail: (
    <Icon>
      <rect x="2.5" y="4" width="11" height="8" rx="1.2" {...stroke} />
      <path d="m3 4.5 5 4 5-4" {...stroke} />
    </Icon>
  ),
  spark: (
    <Icon>
      <path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4.2 4.2l2.1 2.1M9.7 9.7l2.1 2.1M11.8 4.2 9.7 6.3M6.3 9.7 4.2 11.8" {...stroke} />
    </Icon>
  ),
  language: (
    <Icon>
      <circle cx="8" cy="8" r="5.5" {...stroke} />
      <path d="M2.5 8h11M8 2.5c1.5 1.6 2.3 3.4 2.3 5.5S9.5 12 8 13.5" {...stroke} />
    </Icon>
  ),
  plug: (
    <Icon>
      <path d="M6 2.5v3M10 2.5v3M4.5 5.5h7v2.2a3.5 3.5 0 0 1-3.5 3.5h0a3.5 3.5 0 0 1-3.5-3.5V5.5Z" {...stroke} />
      <path d="M8 11.2v2.3" {...stroke} />
    </Icon>
  ),
  heart: (
    <Icon>
      <path d="M8 13.2S3 9.8 3 6.6A2.7 2.7 0 0 1 8 5.2a2.7 2.7 0 0 1 5 1.4c0 3.2-5 6.6-5 6.6Z" {...stroke} />
    </Icon>
  ),
  activity: (
    <Icon>
      <path d="M2.5 8h2.5l1.5-3.5 2.5 7 1.5-3.5H13.5" {...stroke} />
    </Icon>
  ),
  refresh: (
    <Icon>
      <path d="M12.5 6A4.5 4.5 0 1 0 13 9.5" {...stroke} />
      <path d="M12.5 3.5v3h-3" {...stroke} />
    </Icon>
  ),
  archive: (
    <Icon>
      <rect x="2.5" y="3" width="11" height="3" rx="0.8" {...stroke} />
      <path d="M3.5 6v6.5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V6M6.5 9h3" {...stroke} />
    </Icon>
  ),
  shield: (
    <Icon>
      <path d="M8 2.5 13 4.5v4c0 3-2.2 4.8-5 5.5-2.8-.7-5-2.5-5-5.5v-4L8 2.5Z" {...stroke} />
    </Icon>
  ),
  alert: (
    <Icon>
      <path d="M8 2.5 13.5 13h-11L8 2.5Z" {...stroke} />
      <path d="M8 6.5v3M8 11.5h.01" {...stroke} />
    </Icon>
  ),
  audit: (
    <Icon>
      <path d="M5 2.5h6l2.5 2.5v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" {...stroke} />
      <path d="M5.5 7.5h5M5.5 10h3.5" {...stroke} />
    </Icon>
  ),
  accessibility: (
    <Icon>
      <circle cx="8" cy="3.5" r="1.3" {...stroke} />
      <path d="M4 6.5h8M8 6.5v3.5l-2.5 4M8 10l2.5 4" {...stroke} />
    </Icon>
  ),
} as const;

export type NavIconName = keyof typeof navIcons;

export function NavIcon({ name }: { name?: string }) {
  if (!name || !(name in navIcons)) return null;
  return navIcons[name as NavIconName];
}
