import type { Email } from "../types";
import { layout } from "./_layout";

export function verifyEmail({
  to,
  name,
  url,
}: {
  to: string;
  name?: string | null;
  url: string;
}): Email {
  const greeting = name ? `Welcome, ${name}.` : "Welcome.";

  return {
    to,
    subject: "Confirm your email — Avonix AI",
    html: layout({
      heading: "Confirm your email",
      body: [
        greeting,
        "Confirm this address so we can send you lead notifications and password resets.",
      ],
      cta: { label: "Confirm email", url },
      footer:
        "If you did not create an Avonix AI account, you can ignore this email.",
    }),
    text: [
      greeting,
      "",
      "Confirm this address so we can send you lead notifications and password resets:",
      url,
      "",
      "If you did not create an Avonix AI account, ignore this email.",
    ].join("\n"),
  };
}
