import type { Email } from "../types";

/**
 * Notifies the agency/client inbox that someone submitted a form.
 */
export function formSubmissionEmail({
  to,
  formName,
  websiteName,
  pageUrl,
  rows,
  replyTo,
}: {
  to: string;
  formName: string;
  websiteName?: string | null;
  pageUrl?: string | null;
  rows: { label: string; value: string }[];
  replyTo?: string | null;
}): Email {
  const safeRows = rows.filter((r) => r.value.trim());
  const where = [formName, websiteName].filter(Boolean).join(" · ");

  const listHtml = safeRows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 14px;border:1px solid #edf0f5;border-radius:10px;overflow:hidden">
        ${safeRows
          .map(
            (r, i) => `<tr style="background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"}">
            <td style="padding:10px 12px;font-size:12.5px;font-weight:600;color:#5b6b83;width:34%;vertical-align:top">${escapeHtml(r.label)}</td>
            <td style="padding:10px 12px;font-size:14px;color:#13233c;word-break:break-word">${escapeHtml(r.value).replace(/\n/g, "<br>")}</td>
          </tr>`,
          )
          .join("")}
      </table>`
    : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3c4c66">No field values were included.</p>`;

  const footer = pageUrl
    ? `Submitted from ${escapeHtml(pageUrl)}`
    : "Sent by Avonix AI form notifications.";

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f6f9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e9f0;border-radius:14px">
    <tr><td style="padding:26px 28px">
      <div style="margin-bottom:20px;font-size:16px;font-weight:700;color:#13233c">Avonix AI</div>
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#13233c">New form submission</h1>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3c4c66">A new submission arrived on <strong>${escapeHtml(where || "your form")}</strong>.</p>
      ${listHtml}
      <p style="margin:18px 0 0;padding-top:16px;border-top:1px solid #edf0f5;font-size:12.5px;line-height:1.6;color:#8b98ab">${footer}</p>
    </td></tr>
  </table>
</body></html>`;

  const textLines = [
    "New form submission",
    where ? `Form: ${where}` : null,
    pageUrl ? `Page: ${pageUrl}` : null,
    "",
    ...safeRows.map((r) => `${r.label}: ${r.value}`),
  ].filter((line): line is string => line !== null);

  return {
    to,
    subject: `New submission — ${formName}`,
    replyTo: replyTo ?? undefined,
    html,
    text: textLines.join("\n"),
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
