import type { ReactNode } from "react";

const s = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={className ?? "size-4 shrink-0"}
      fill="none"
    >
      {children}
    </svg>
  );
}

/** Simple line icons for Plan & Billing screens. */
export const BIcon = {
  overview: (
    <Svg>
      <rect x="3" y="3" width="7" height="7" rx="1.5" {...s} />
      <rect x="14" y="3" width="7" height="7" rx="1.5" {...s} />
      <rect x="3" y="14" width="7" height="7" rx="1.5" {...s} />
      <rect x="14" y="14" width="7" height="7" rx="1.5" {...s} />
    </Svg>
  ),
  plan: (
    <Svg>
      <path d="M12 3 20 7.5 12 12 4 7.5 12 3Z" {...s} />
      <path d="M4 12 12 16.5 20 12" {...s} />
      <path d="M4 16.5 12 21 20 16.5" {...s} />
    </Svg>
  ),
  card: (
    <Svg>
      <rect x="2" y="5" width="20" height="14" rx="2" {...s} />
      <path d="M2 10h20" {...s} />
      <path d="M6 15h4" {...s} />
    </Svg>
  ),
  calendar: (
    <Svg>
      <rect x="3" y="5" width="18" height="16" rx="2" {...s} />
      <path d="M3 10h18M8 3v4M16 3v4" {...s} />
    </Svg>
  ),
  refresh: (
    <Svg>
      <path d="M3 12a9 9 0 0 1 15.5-6.4L21 8" {...s} />
      <path d="M21 3v5h-5" {...s} />
      <path d="M21 12a9 9 0 0 1-15.5 6.4L3 16" {...s} />
      <path d="M3 21v-5h5" {...s} />
    </Svg>
  ),
  money: (
    <Svg>
      <circle cx="12" cy="12" r="9" {...s} />
      <path d="M12 7v10M9.5 9.5c.5-1 1.5-1.5 2.5-1.5s2 .6 2 1.8c0 2.2-4 1.5-4 3.7 0 1.1.9 1.8 2 1.8s2-.5 2.5-1.5" {...s} />
    </Svg>
  ),
  check: (
    <Svg>
      <circle cx="12" cy="12" r="9" {...s} />
      <path d="m8 12 2.5 2.5L16 9" {...s} />
    </Svg>
  ),
  warn: (
    <Svg>
      <path d="M12 3 21 20H3L12 3Z" {...s} />
      <path d="M12 10v4M12 17h.01" {...s} />
    </Svg>
  ),
  users: (
    <Svg>
      <circle cx="9" cy="8" r="3" {...s} />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" {...s} />
      <circle cx="17" cy="9" r="2.5" {...s} />
      <path d="M16 14.5c2.2.3 4.5 1.5 4.5 4.5" {...s} />
    </Svg>
  ),
  globe: (
    <Svg>
      <circle cx="12" cy="12" r="9" {...s} />
      <path d="M3 12h18M12 3c2.5 2.8 3.8 5.5 3.8 9S14.5 18.2 12 21c-2.5-2.8-3.8-5.5-3.8-9S9.5 5.8 12 3Z" {...s} />
    </Svg>
  ),
  building: (
    <Svg>
      <path d="M4 21h16" {...s} />
      <path d="M6 21V5h12v16" {...s} />
      <path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" {...s} />
    </Svg>
  ),
  chart: (
    <Svg>
      <path d="M4 20h16" {...s} />
      <path d="M7 20V12M12 20V7M17 20v-5" {...s} />
    </Svg>
  ),
  spark: (
    <Svg>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" {...s} />
    </Svg>
  ),
  invoice: (
    <Svg>
      <path d="M7 3h8l4 4v14H7V3Z" {...s} />
      <path d="M15 3v4h4M10 12h6M10 16h6" {...s} />
    </Svg>
  ),
  history: (
    <Svg>
      <circle cx="12" cy="12" r="9" {...s} />
      <path d="M12 7v5l3 2" {...s} />
    </Svg>
  ),
  gear: (
    <Svg>
      <circle cx="12" cy="12" r="3" {...s} />
      <path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" {...s} />
    </Svg>
  ),
  tag: (
    <Svg>
      <path d="M20 12 12 4H5v7l8 8 7-7Z" {...s} />
      <circle cx="8.5" cy="8.5" r="1" {...s} />
    </Svg>
  ),
  mail: (
    <Svg>
      <rect x="3" y="5" width="18" height="14" rx="2" {...s} />
      <path d="m3 8 9 6 9-6" {...s} />
    </Svg>
  ),
  download: (
    <Svg>
      <path d="M12 4v10M8 10l4 4 4-4M5 18h14" {...s} />
    </Svg>
  ),
  shield: (
    <Svg>
      <path d="M12 3 20 7v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" {...s} />
    </Svg>
  ),
  arrowUp: (
    <Svg>
      <path d="M12 19V5M6 11l6-6 6 6" {...s} />
    </Svg>
  ),
  wallet: (
    <Svg>
      <path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" {...s} />
      <path d="M3 7V5.5A2.5 2.5 0 0 1 5.5 3H17" {...s} />
      <path d="M16 13.5h3" {...s} />
    </Svg>
  ),
  help: (
    <Svg>
      <circle cx="12" cy="12" r="9" {...s} />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 2.2M12 17h.01" {...s} />
    </Svg>
  ),
};

export type BillingIconName = keyof typeof BIcon;

export function BillingIcon({
  name,
  className = "size-4",
}: {
  name: BillingIconName;
  className?: string;
}) {
  const icon = BIcon[name];
  return (
    <span className={`inline-flex text-current [&_svg]:size-full ${className}`}>
      {icon}
    </span>
  );
}
