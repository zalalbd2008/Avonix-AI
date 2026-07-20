import type { Email } from "../types";
import { layout } from "./_layout";

export function resetPasswordEmail({
  to,
  name,
  url,
}: {
  to: string;
  name?: string | null;
  url: string;
}): Email {
  const greeting = name ? `Hi ${name},` : "Hi,";

  return {
    to,
    subject: "Reset your Avonix AI password",
    html: layout({
      heading: "Reset your password",
      body: [
        greeting,
        "Someone asked to reset the password for this account. Click below to choose a new one.",
      ],
      cta: { label: "Choose a new password", url },
      footer:
        "This link expires in one hour and can be used once. If you did not ask for it, you can ignore this email — your password will not change.",
    }),
    text: [
      greeting,
      "",
      "Someone asked to reset the password for this account.",
      "Open this link to choose a new one:",
      url,
      "",
      "The link expires in one hour and can be used once.",
      "If you did not ask for it, ignore this email — your password will not change.",
    ].join("\n"),
  };
}
