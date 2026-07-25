import type { Email } from "../types";
import { layout } from "./_layout";

/** Credentials email when Platform Owner provisions an org with a password. */
export function orgAccessEmail({
  to,
  organizationName,
  roleLabel,
  email,
  password,
  signInUrl,
}: {
  to: string;
  organizationName: string;
  roleLabel: string;
  email: string;
  password: string;
  signInUrl: string;
}): Email {
  return {
    to,
    subject: `Your ${organizationName} account on Avonix AI`,
    html: layout({
      heading: `Welcome to ${organizationName}`,
      body: [
        `A Platform Owner created your organization workspace and assigned you as ${roleLabel}.`,
        `Sign in with the email and password below. Change the password after your first login.`,
        `<strong>Email:</strong> ${email}<br><strong>Temporary password:</strong> ${password}`,
      ],
      cta: { label: "Sign in to Avonix", url: signInUrl },
      footer: "If you were not expecting this account, contact your Platform Owner.",
    }),
    text: [
      `Welcome to ${organizationName}`,
      "",
      `Role: ${roleLabel}`,
      `Email: ${email}`,
      `Temporary password: ${password}`,
      "",
      `Sign in: ${signInUrl}`,
    ].join("\n"),
  };
}
