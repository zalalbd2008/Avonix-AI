import type { Email, EmailProvider } from "../types";

/**
 * Production transport. Plain fetch rather than the SDK — one less dependency,
 * and the shape is small enough that swapping to Postmark or SES later is a
 * single file.
 */
export function resendProvider(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(email: Email) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email.to],
          reply_to: email.replyTo,
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        // Throw rather than log: a failed password-reset send must surface, not
        // leave the user waiting for a message that never arrives.
        throw new Error(
          `Email send failed (${res.status}). Check RESEND_API_KEY, that EMAIL_FROM uses a verified domain, and Resend dashboard logs. ${body.slice(0, 200)}`,
        );
      }

      const data = (await res.json()) as { id?: string };
      return { id: data.id };
    },
  };
}
