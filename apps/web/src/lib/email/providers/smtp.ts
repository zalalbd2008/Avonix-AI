import nodemailer from "nodemailer";
import type { Email, EmailProvider } from "../types";

/**
 * Generic SMTP transport (Gmail App Password, Workspace, Hostinger, SES SMTP, …).
 *
 * Env:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
 *   SMTP_SECURE=true for port 465
 *   EMAIL_FROM (required — envelope From)
 */
export function smtpProvider(opts: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}): EmailProvider {
  const transporter = nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: {
      user: opts.user,
      pass: opts.pass,
    },
  });

  return {
    name: "smtp",
    async send(email: Email) {
      const info = await transporter.sendMail({
        from: opts.from,
        to: email.to,
        replyTo: email.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      return { id: info.messageId };
    },
  };
}
