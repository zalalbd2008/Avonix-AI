import type { Email } from "../types";
import { layout } from "./_layout";

export function inviteEmail({
  to,
  organizationName,
  roleLabel,
  url,
  expiresDays,
}: {
  to: string;
  organizationName: string;
  roleLabel: string;
  url: string;
  expiresDays: number;
}): Email {
  return {
    to,
    subject: `Join ${organizationName} on Avonix AI`,
    html: layout({
      heading: `You're invited to ${organizationName}`,
      body: [
        `You've been invited to join ${organizationName} as ${roleLabel}.`,
        `This link expires in ${expiresDays} days.`,
      ],
      cta: { label: "Accept invitation", url },
      footer: "If you were not expecting this, you can ignore this email.",
    }),
    text: [
      `You're invited to ${organizationName} as ${roleLabel}.`,
      "",
      `Accept: ${url}`,
      "",
      `Expires in ${expiresDays} days.`,
    ].join("\n"),
  };
}
