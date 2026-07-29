import type { Email } from "@/lib/email/types";
import { layout } from "@/lib/email/templates/_layout";
import { trackingClickUrl } from "./tracking-urls";
import {
  defaultAdminAlertBody,
  defaultThankYouBody,
  mergeTokens,
  type MergeContext,
} from "./interpolate";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Turn plain URLs into tracked <a> tags when a token is present. */
function htmlBodyWithOptionalTracking(
  bodyText: string,
  trackingToken?: string,
): string {
  const escaped = escapeHtml(bodyText);
  if (!trackingToken) {
    return escaped.replace(/\n/g, "<br>");
  }
  return escaped
    .replace(/(https?:\/\/[^\s<]+)/g, (url) => {
      const tracked = trackingClickUrl(trackingToken, url);
      return `<a href="${tracked}" style="color:#0d9488">${url}</a>`;
    })
    .replace(/\n/g, "<br>");
}

export function thankYouEmail(opts: {
  to: string;
  websiteName: string;
  replyTo?: string | null;
  subject?: string;
  /** Plain template with {{tokens}} or empty → AI default body. */
  template?: string;
  ctx: MergeContext;
  /** Optional open-tracking pixel URL. */
  trackingPixelUrl?: string;
  /** When set, http(s) links in the body are click-tracked. */
  trackingToken?: string;
}): Email {
  const bodyText = opts.template?.trim()
    ? mergeTokens(opts.template, opts.ctx)
    : defaultThankYouBody({ ...opts.ctx, websiteName: opts.websiteName });

  const htmlBody = htmlBodyWithOptionalTracking(bodyText, opts.trackingToken);
  const subject =
    opts.subject?.trim() ||
    `Thanks for contacting ${opts.websiteName}`;

  const pixel = opts.trackingPixelUrl
    ? `<img src="${opts.trackingPixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0" />`
    : "";

  return {
    to: opts.to,
    subject,
    replyTo: opts.replyTo ?? undefined,
    html: layout({
      heading: `Thanks from ${opts.websiteName}`,
      body: [htmlBody + pixel],
      footer: opts.replyTo
        ? `You can reply to this email and it will reach ${opts.websiteName}.`
        : `This message was sent by ${opts.websiteName}.`,
    }),
    text: bodyText,
  };
}

export function automationAdminEmail(opts: {
  to: string;
  websiteName: string;
  replyTo?: string | null;
  subject?: string;
  template?: string;
  ctx: MergeContext;
}): Email {
  const bodyText = opts.template?.trim()
    ? mergeTokens(opts.template, opts.ctx)
    : defaultAdminAlertBody({ ...opts.ctx, websiteName: opts.websiteName });

  const htmlBody = escapeHtml(bodyText).replace(/\n/g, "<br>");
  const subject =
    opts.subject?.trim() ||
    `New lead — ${opts.ctx.formName || opts.websiteName}`;

  return {
    to: opts.to,
    subject,
    replyTo: opts.replyTo ?? undefined,
    html: layout({
      heading: "Team alert",
      body: [htmlBody],
      footer: `Automation · ${opts.websiteName}`,
    }),
    text: bodyText,
  };
}
