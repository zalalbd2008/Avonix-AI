import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Email, EmailProvider } from "../types";

/**
 * Development transport. Writes each message to `.mail/` and logs the subject
 * and any link it contains.
 *
 * This exists so the reset-password and verification flows are testable *today*,
 * before anyone has signed up for a sending service. The alternative — wiring
 * the real provider and leaving it unconfigured — fails silently, which is the
 * worst of both worlds: the UI says "check your email" and nothing was ever
 * sent.
 */
export const consoleProvider: EmailProvider = {
  name: "console",
  async send(email: Email) {
    const dir = join(process.cwd(), ".mail");
    await mkdir(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeTo = email.to.replace(/[^a-z0-9@._-]/gi, "_");
    const file = join(dir, `${stamp}__${safeTo}.html`);
    await writeFile(file, email.html, "utf8");

    const link = email.text.match(/https?:\/\/\S+/)?.[0];
    console.log(
      [
        "",
        "  ┌─ email (dev transport — nothing actually sent)",
        `  │ to:      ${email.to}`,
        `  │ subject: ${email.subject}`,
        email.replyTo ? `  │ replyTo: ${email.replyTo}` : null,
        link ? `  │ link:    ${link}` : null,
        `  │ saved:   ${file}`,
        "  └─",
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    return { id: file };
  },
};
