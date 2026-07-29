/**
 * Merge {{tokens}} into automation messages.
 * Supports contact, AI, and form field keys (case-insensitive).
 */

export type MergeContext = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  websiteName?: string | null;
  formName?: string | null;
  category?: string | null;
  score?: number | null;
  followUp?: string | null;
  values?: Record<string, unknown>;
};

function dig(values: Record<string, unknown> | undefined, key: string): string {
  if (!values) return "";
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(values)) {
    if (k.toLowerCase() === lower && v != null && String(v).trim()) {
      return String(v).trim();
    }
  }
  return "";
}

export function mergeTokens(template: string, ctx: MergeContext): string {
  const map: Record<string, string> = {
    name: ctx.name?.trim() || dig(ctx.values, "name") || "there",
    email: ctx.email?.trim() || dig(ctx.values, "email"),
    phone: ctx.phone?.trim() || dig(ctx.values, "phone"),
    message: ctx.message?.trim() || dig(ctx.values, "message"),
    website: ctx.websiteName?.trim() || "",
    websiteName: ctx.websiteName?.trim() || "",
    form: ctx.formName?.trim() || "",
    formName: ctx.formName?.trim() || "",
    category: ctx.category?.trim() || dig(ctx.values, "category") || "your request",
    score: ctx.score != null ? String(ctx.score) : "",
    followup: ctx.followUp?.trim() || "",
    followUp: ctx.followUp?.trim() || "",
    company: dig(ctx.values, "company") || dig(ctx.values, "business"),
    service: dig(ctx.values, "service") || dig(ctx.values, "services"),
    city: dig(ctx.values, "city") || dig(ctx.values, "location"),
    budget: dig(ctx.values, "budget"),
  };

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const fromMap = map[key] ?? map[key.toLowerCase()];
    if (fromMap != null && fromMap !== "") return fromMap;
    return dig(ctx.values, key);
  });
}

/** Build a short AI-flavored thank-you when no custom template is set. */
export function defaultThankYouBody(ctx: MergeContext): string {
  const name = ctx.name?.trim() || dig(ctx.values, "name") || "there";
  const service =
    dig(ctx.values, "service") ||
    dig(ctx.values, "services") ||
    ctx.category?.trim() ||
    "your request";
  const city = dig(ctx.values, "city");
  const company = dig(ctx.values, "company");

  const lines = [`Hi ${name},`, ""];

  if (company && service) {
    lines.push(
      `Thanks for reaching out from ${company} about ${service}${city ? ` in ${city}` : ""}.`,
    );
  } else if (service) {
    lines.push(
      `Thanks for requesting help with ${service}${city ? ` in ${city}` : ""}.`,
    );
  } else {
    lines.push(`Thanks for contacting ${ctx.websiteName?.trim() || "us"}.`);
  }

  lines.push("");
  if (ctx.followUp?.trim()) {
    lines.push(ctx.followUp.trim());
  } else {
    lines.push("Our team will review your details and get back to you shortly.");
  }
  lines.push("");
  lines.push(`— ${ctx.websiteName?.trim() || "The team"}`);
  return lines.join("\n");
}

export function defaultAdminAlertBody(ctx: MergeContext): string {
  const bits = [
    `New automation alert${ctx.formName ? ` — ${ctx.formName}` : ""}`,
    ctx.websiteName ? `Website: ${ctx.websiteName}` : "",
    ctx.name ? `Name: ${ctx.name}` : "",
    ctx.email ? `Email: ${ctx.email}` : "",
    ctx.phone ? `Phone: ${ctx.phone}` : "",
    ctx.category ? `Category: ${ctx.category}` : "",
    ctx.score != null ? `Lead score: ${ctx.score}` : "",
    ctx.message ? `Message: ${ctx.message}` : "",
  ].filter(Boolean);
  return bits.join("\n");
}
