import type { ReactNode } from "react";
import type { IconName } from "./registry";

/**
 * Stroke SVG path sets (24×24 viewBox). Rendered with currentColor.
 */
export const ICON_PATHS: Record<IconName, ReactNode> = {
  row: (
    <>
      <rect x="3" y="8" width="18" height="3" rx="1" />
      <rect x="3" y="13" width="18" height="3" rx="1" />
    </>
  ),
  column: (
    <>
      <rect x="5" y="3" width="4" height="18" rx="1" />
      <rect x="11" y="3" width="4" height="18" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </>
  ),
  section: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h16" />
    </>
  ),
  container: <rect x="4" y="5" width="16" height="14" rx="2" />,
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  divider: <path d="M4 12h16" />,
  text: (
    <>
      <path d="M5 6h14" />
      <path d="M12 6v12" />
      <path d="M8 18h8" />
    </>
  ),
  textarea: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M7 9h10M7 12h8M7 15h6" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 8l9 6 9-6" />
    </>
  ),
  phone: (
    <>
      <path d="M7 3h3l1.5 4-2 1.5a12 12 0 006 6L17 13l4 1.5v3a2 2 0 01-2.2 2A16 16 0 015 7.2 2 2 0 017 3z" />
    </>
  ),
  number: (
    <>
      <path d="M8 5v14M16 5v14M5 9h14M5 15h14" />
    </>
  ),
  url: (
    <>
      <path d="M10 13a5 5 0 007.07 0l2.12-2.12a5 5 0 00-7.07-7.07L10.5 5.5" />
      <path d="M14 11a5 5 0 00-7.07 0L4.8 13.12a5 5 0 007.07 7.07L13.5 18.5" />
    </>
  ),
  password: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  hidden: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M4 4l16 16" />
    </>
  ),
  checkbox: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
    </>
  ),
  select: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M8 11l4 4 4-4" />
    </>
  ),
  multiselect: (
    <>
      <rect x="3" y="4" width="18" height="5" rx="1" />
      <rect x="3" y="10" width="18" height="5" rx="1" />
      <rect x="3" y="16" width="18" height="5" rx="1" />
      <path d="M6 6.5l1.2 1.2L9.5 5.5M6 12.5l1.2 1.2L9.5 11.5" />
    </>
  ),
  toggle: (
    <>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <circle cx="15" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </>
  ),
  chips: (
    <>
      <rect x="2" y="8" width="8" height="8" rx="4" />
      <rect x="12" y="8" width="10" height="8" rx="4" />
    </>
  ),
  date: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
    </>
  ),
  time: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </>
  ),
  file: (
    <>
      <path d="M8 3h6l5 5v11a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z" />
      <path d="M14 3v5h5" />
    </>
  ),
  signature: (
    <>
      <path d="M4 17c2-4 4-6 6-4s2 6 5 5 3-5 5-6" />
      <path d="M4 20h16" />
    </>
  ),
  rating: (
    <>
      <path d="M12 3l2.4 5 5.6.8-4 4 .9 5.7L12 16l-4.9 2.5.9-5.7-4-4 5.6-.8z" />
    </>
  ),
  range: (
    <>
      <path d="M4 12h16" />
      <circle cx="15" cy="12" r="3" fill="currentColor" stroke="none" />
    </>
  ),
  color: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16" />
    </>
  ),
  appointment: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16M9 14h2M13 14h2M9 17h2" />
    </>
  ),
  roi: (
    <>
      <path d="M4 18V8l5 4 4-7 7 10" />
      <path d="M16 15h4v4" />
    </>
  ),
  company: (
    <>
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  website: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M3 12h18M12 4c2.5 2.5 3.5 5 3.5 8S14.5 17.5 12 20c-2.5-2.5-3.5-5-3.5-8S9.5 6.5 12 4z" />
    </>
  ),
  address: (
    <>
      <path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  country: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M3 12h18M12 4a14 14 0 010 16M12 4a14 14 0 000 16" />
    </>
  ),
  currency: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9 9.5c.8-1 2-1.5 3-1.5s2.2.6 3 1.5M9 14.5c.8 1 2 1.5 3 1.5s2.2-.6 3-1.5" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4 16l4.5-4 3 3 3-4L20 16" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </>
  ),
  icon: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  logic: (
    <>
      <path d="M7 5v6a3 3 0 003 3h4a3 3 0 003-3V5" />
      <circle cx="7" cy="5" r="2" />
      <circle cx="17" cy="5" r="2" />
      <path d="M12 14v5" />
      <circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="4" width="6" height="5" rx="1" />
      <rect x="15" y="4" width="6" height="5" rx="1" />
      <rect x="9" y="15" width="6" height="5" rx="1" />
      <path d="M6 9v3h12V9M12 12v3" />
    </>
  ),
  ai: (
    <>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </>
  ),
  webhook: (
    <>
      <circle cx="7" cy="8" r="3" />
      <circle cx="17" cy="8" r="3" />
      <circle cx="12" cy="17" r="3" />
      <path d="M9.5 10l1.5 4M14.5 10l-1.5 4" />
    </>
  ),
  integration: (
    <>
      <path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM13 13h3v3h-3z" />
      <path d="M5 5h14v14H5z" />
    </>
  ),
  sms: (
    <>
      <path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M12 4a8 8 0 00-6.9 12l-1 3.5 3.6-1A8 8 0 1012 4z" />
      <path d="M9.5 10.5c.3-.5.7-.5 1 0l.8 1.2c.2.3.1.7-.2.9l-.5.3c.6 1.2 1.6 2.1 2.8 2.6l.4-.6c.2-.3.6-.4.9-.2l1.3.7c.4.2.5.7.1 1.1A4.5 4.5 0 019.5 10.5z" />
    </>
  ),
  chat: (
    <>
      <path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V7a2 2 0 012-2z" />
    </>
  ),
  reports: (
    <>
      <path d="M6 18V10M12 18V6M18 18v-8" />
      <path d="M4 20h16" />
    </>
  ),
  analytics: (
    <>
      <path d="M4 18l5-6 4 3 7-9" />
      <path d="M4 20h16" />
    </>
  ),
  funnel: (
    <>
      <path d="M4 5h16l-5 6v6l-3 2v-8L4 5z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 017.5-2" />
    </>
  ),
  recaptcha: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 12l2.5 2.5L16 9" />
    </>
  ),
  privacy: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  palette: (
    <>
      <path d="M12 4a8 8 0 100 16h1.5a2 2 0 002-2 1.5 1.5 0 011.5-1.5H18a2 2 0 000-4h-.5A1.5 1.5 0 0116 11a2 2 0 01-2-2V8.5A1.5 1.5 0 0115.5 7H16a2 2 0 000-4h-4z" />
      <circle cx="8.5" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="14" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  brush: (
    <>
      <path d="M14 4l6 6-8 8H6v-6z" />
      <path d="M12 6l6 6" />
    </>
  ),
  typography: (
    <>
      <path d="M5 6h14M12 6v12M8 18h8" />
    </>
  ),
  border: <rect x="5" y="5" width="14" height="14" rx="1" strokeDasharray="3 2" />,
  shadow: (
    <>
      <rect x="5" y="5" width="11" height="11" rx="1" />
      <path d="M9 16h7a1 1 0 001-1V8" />
    </>
  ),
  animation: (
    <>
      <path d="M5 12h4l2-6 3 12 2-6h3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 6.3l1.4 1.4M17.7 16.3l1.4 1.4M3 12h2M19 12h2M4.9 17.7l1.4-1.4M17.7 7.7l1.4-1.4" />
    </>
  ),
  visibility: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  roles: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3 3-5 6-5s6 2 6 5M14 19c0-2 1.5-3.5 3.5-3.5S21 17 21 19" />
    </>
  ),
  notifications: (
    <>
      <path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z" />
      <path d="M10 19a2 2 0 004 0" />
    </>
  ),
  add: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  remove: (
    <>
      <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </>
  ),
  duplicate: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M4 16V6a2 2 0 012-2h10" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </>
  ),
  paste: (
    <>
      <path d="M8 5h3a2 2 0 002-2h0a2 2 0 002 2h3v3H8V5z" />
      <rect x="6" y="8" width="12" height="12" rx="2" />
    </>
  ),
  import: (
    <>
      <path d="M12 4v10M8 10l4 4 4-4" />
      <path d="M5 18h14" />
    </>
  ),
  export: (
    <>
      <path d="M12 14V4M8 8l4-4 4 4" />
      <path d="M5 18h14" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v13H5V4z" />
      <path d="M8 4v5h7V4M8 20v-6h8v6" />
    </>
  ),
  publish: (
    <>
      <path d="M12 19V9M8 12l4-4 4 4" />
      <path d="M5 19h14" />
    </>
  ),
  preview: (
    <>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  undo: <path d="M9 8H5V4M5 8a8 8 0 11-1.5 7" />,
  redo: <path d="M15 8h4V4M19 8a8 8 0 10-1.5 7" />,
  grip: (
    <>
      <circle cx="9" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v4M9 3h6l-1 6h3l-5 5-5-5h3L9 3z" />
    </>
  ),
  unpin: (
    <>
      <path d="M12 17v4M9 3h6l-1 6h3l-5 5-5-5h3L9 3z" />
      <path d="M4 4l16 16" />
    </>
  ),
  expand: <path d="M8 14l4 4 4-4M8 10l4-4 4 4" />,
  collapse: <path d="M8 10l4 4 4-4M8 14l4-4 4 4" />,
  pack: (
    <>
      <path d="M4 8l8-4 8 4v8l-8 4-8-4V8z" />
      <path d="M12 12v8M4 8l8 4 8-4" />
    </>
  ),
  budget: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9.5 9.5c.7-.8 1.7-1.2 2.5-1.2s1.8.4 2.5 1.2M9.5 14.5c.7.8 1.7 1.2 2.5 1.2s1.8-.4 2.5-1.2" />
    </>
  ),
  enterprise: (
    <>
      <path d="M4 20V8l5-3 3 2 3-2 5 3v12" />
      <path d="M9 20v-5h6v5" />
    </>
  ),
  discovery: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </>
  ),
  qualification: (
    <>
      <path d="M8 12l3 3 5-6" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  choice: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="1.5" />
      <rect x="3" y="14" width="18" height="6" rx="1.5" />
    </>
  ),
};
