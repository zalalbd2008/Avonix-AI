/**
 * Shared shell for every transactional email.
 *
 * Table-based and inline-styled on purpose: email clients strip <style> blocks,
 * ignore flexbox, and Outlook still renders with Word. This is not a place to
 * reuse the app's Tailwind.
 */
export function layout({
  heading,
  body,
  cta,
  footer,
}: {
  heading: string;
  body: string[];
  cta?: { label: string; url: string };
  footer?: string;
}) {
  const paragraphs = body
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#3c4c66">${p}</p>`,
    )
    .join("");

  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0">
         <tr><td style="border-radius:8px;background:#ff6600">
           <a href="${cta.url}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none">${cta.label}</a>
         </td></tr>
       </table>
       <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#8b98ab">
         If the button does not work, paste this into your browser:<br>
         <a href="${cta.url}" style="color:#0d9488;word-break:break-all">${cta.url}</a>
       </p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f6f9;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e9f0;border-radius:14px">
    <tr><td style="padding:26px 28px">
      <div style="margin-bottom:20px;font-size:16px;font-weight:700;color:#13233c">Avonix AI</div>
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:700;color:#13233c">${heading}</h1>
      ${paragraphs}
      ${button}
      ${footer ? `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid #edf0f5;font-size:12.5px;line-height:1.6;color:#8b98ab">${footer}</p>` : ""}
    </td></tr>
  </table>
</body></html>`;
}
