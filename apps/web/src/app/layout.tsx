import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

/**
 * The typeface the prototype specifies. Loaded through next/font so it is
 * self-hosted and does not cost a round trip to Google on first paint.
 */
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Avonix AI — one dashboard for every client's leads", template: "%s · Avonix AI" },
  description:
    "A GoHighLevel alternative for agencies that work in WordPress. Every client's forms and chat in one CRM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={instrumentSans.variable} suppressHydrationWarning>
      {/* Extensions (password managers, etc.) inject attributes onto <body>
          before React hydrates — suppressHydrationWarning is the supported fix. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
