import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Avonix AI", template: "%s · Avonix AI" },
  description: "One dashboard for every client's leads.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
