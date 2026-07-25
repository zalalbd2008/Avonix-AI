import type {
  FormTrustBadge,
  FormTrustConfig,
  FormTrustLogo,
  FormTrustTestimonial,
} from "@/lib/db/schema";

export const DEFAULT_TRUST: FormTrustConfig = {
  enabled: false,
  placement: "below",
  title: "Trusted by teams like yours",
  logos: [
    { id: "logo_1", name: "Acme" },
    { id: "logo_2", name: "Northwind" },
    { id: "logo_3", name: "Globex" },
  ],
  testimonials: [
    {
      id: "t_1",
      quote: "Clear process, fast turnaround, and a form that actually converts.",
      author: "Sara Chen",
      role: "Marketing lead",
      rating: 5,
    },
  ],
  rating: { value: 4.9, count: 128, label: "Average rating" },
  badges: [
    { id: "b_1", label: "SSL secured", icon: "🔒" },
    { id: "b_2", label: "GDPR ready", icon: "✓" },
    { id: "b_3", label: "No spam", icon: "🛡" },
  ],
  gdprNotice:
    "By submitting, you agree we may contact you about this enquiry. You can request deletion anytime.",
  privacySummary: "We only use your details to respond to this request.",
  privacyUrl: "",
};

export function normalizeTrust(
  raw?: FormTrustConfig | null,
): FormTrustConfig {
  const logos = normalizeLogos(raw?.logos);
  const testimonials = normalizeTestimonials(raw?.testimonials);
  const badges = normalizeBadges(raw?.badges);
  const placement =
    raw?.placement === "above" || raw?.placement === "both"
      ? raw.placement
      : "below";

  return {
    enabled: Boolean(raw?.enabled),
    placement,
    ...(raw?.title?.trim()
      ? { title: raw.title.trim().slice(0, 80) }
      : { title: DEFAULT_TRUST.title }),
    ...(logos.length ? { logos } : {}),
    ...(testimonials.length ? { testimonials } : {}),
    ...(raw?.rating && typeof raw.rating.value === "number"
      ? {
          rating: {
            value: Math.min(5, Math.max(0, Math.round(raw.rating.value * 10) / 10)),
            ...(typeof raw.rating.count === "number"
              ? { count: Math.min(1_000_000, Math.max(0, Math.round(raw.rating.count))) }
              : {}),
            ...(raw.rating.label?.trim()
              ? { label: raw.rating.label.trim().slice(0, 40) }
              : {}),
          },
        }
      : {}),
    ...(badges.length ? { badges } : {}),
    ...(raw?.gdprNotice?.trim()
      ? { gdprNotice: raw.gdprNotice.trim().slice(0, 500) }
      : {}),
    ...(raw?.privacySummary?.trim()
      ? { privacySummary: raw.privacySummary.trim().slice(0, 400) }
      : {}),
    ...(raw?.privacyUrl?.trim()
      ? { privacyUrl: raw.privacyUrl.trim().slice(0, 2000) }
      : {}),
  };
}

function normalizeLogos(raw?: FormTrustLogo[]): FormTrustLogo[] {
  if (!Array.isArray(raw)) return [];
  const out: FormTrustLogo[] = [];
  for (const [i, l] of raw.entries()) {
    const name = l?.name?.trim();
    if (!name) continue;
    out.push({
      id: (l.id?.trim() || `logo_${i + 1}`).slice(0, 40),
      name: name.slice(0, 60),
      ...(l.imageUrl?.trim()
        ? { imageUrl: l.imageUrl.trim().slice(0, 500) }
        : {}),
      ...(l.url?.trim() ? { url: l.url.trim().slice(0, 500) } : {}),
    });
    if (out.length >= 12) break;
  }
  return out;
}

function normalizeTestimonials(
  raw?: FormTrustTestimonial[],
): FormTrustTestimonial[] {
  if (!Array.isArray(raw)) return [];
  const out: FormTrustTestimonial[] = [];
  for (const [i, t] of raw.entries()) {
    const quote = t?.quote?.trim();
    const author = t?.author?.trim();
    if (!quote || !author) continue;
    out.push({
      id: (t.id?.trim() || `t_${i + 1}`).slice(0, 40),
      quote: quote.slice(0, 400),
      author: author.slice(0, 80),
      ...(t.role?.trim() ? { role: t.role.trim().slice(0, 80) } : {}),
      ...(typeof t.rating === "number"
        ? { rating: Math.min(5, Math.max(1, Math.round(t.rating))) }
        : {}),
    });
    if (out.length >= 6) break;
  }
  return out;
}

function normalizeBadges(raw?: FormTrustBadge[]): FormTrustBadge[] {
  if (!Array.isArray(raw)) return [];
  const out: FormTrustBadge[] = [];
  for (const [i, b] of raw.entries()) {
    const label = b?.label?.trim();
    if (!label) continue;
    out.push({
      id: (b.id?.trim() || `b_${i + 1}`).slice(0, 40),
      label: label.slice(0, 40),
      ...(b.icon?.trim() ? { icon: b.icon.trim().slice(0, 8) } : {}),
    });
    if (out.length >= 8) break;
  }
  return out;
}

export function newTrustId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function trustHasContent(trust: FormTrustConfig): boolean {
  return (
    Boolean(trust.logos?.length) ||
    Boolean(trust.testimonials?.length) ||
    Boolean(trust.badges?.length) ||
    Boolean(trust.rating?.value) ||
    Boolean(trust.gdprNotice?.trim()) ||
    Boolean(trust.privacySummary?.trim())
  );
}

/** Escape for embed HTML. */
export function escapeTrustHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render trust strip HTML for embed (above/below form). */
export function renderTrustHtml(trust: FormTrustConfig): string {
  if (!trust.enabled || !trustHasContent(trust)) return "";
  const parts: string[] = [];
  if (trust.title?.trim()) {
    parts.push(
      `<p class="avx-trust-title">${escapeTrustHtml(trust.title.trim())}</p>`,
    );
  }
  if (trust.rating && typeof trust.rating.value === "number") {
    const stars = "★".repeat(Math.round(trust.rating.value)).padEnd(5, "☆");
    const count =
      typeof trust.rating.count === "number"
        ? ` · ${trust.rating.count} reviews`
        : "";
    parts.push(
      `<div class="avx-trust-rating"><span class="avx-trust-stars" aria-hidden="true">${stars}</span><span>${escapeTrustHtml(String(trust.rating.value))}${trust.rating.label ? ` ${escapeTrustHtml(trust.rating.label)}` : ""}${escapeTrustHtml(count)}</span></div>`,
    );
  }
  if (trust.logos?.length) {
    parts.push(
      `<div class="avx-trust-logos">${trust.logos
        .map((l) => {
          const inner = l.imageUrl
            ? `<img src="${escapeTrustHtml(l.imageUrl)}" alt="${escapeTrustHtml(l.name)}" loading="lazy">`
            : `<span>${escapeTrustHtml(l.name)}</span>`;
          return l.url
            ? `<a class="avx-trust-logo" href="${escapeTrustHtml(l.url)}" target="_blank" rel="noopener">${inner}</a>`
            : `<span class="avx-trust-logo">${inner}</span>`;
        })
        .join("")}</div>`,
    );
  }
  if (trust.testimonials?.length) {
    parts.push(
      `<div class="avx-trust-quotes">${trust.testimonials
        .map((t) => {
          const stars =
            typeof t.rating === "number"
              ? `<span class="avx-trust-stars" aria-hidden="true">${"★".repeat(t.rating)}</span>`
              : "";
          return `<blockquote class="avx-trust-quote"><p>${escapeTrustHtml(t.quote)}</p>${stars}<footer>— ${escapeTrustHtml(t.author)}${t.role ? `, ${escapeTrustHtml(t.role)}` : ""}</footer></blockquote>`;
        })
        .join("")}</div>`,
    );
  }
  if (trust.badges?.length) {
    parts.push(
      `<div class="avx-trust-badges">${trust.badges
        .map(
          (b) =>
            `<span class="avx-trust-badge">${b.icon ? `<span aria-hidden="true">${escapeTrustHtml(b.icon)}</span> ` : ""}${escapeTrustHtml(b.label)}</span>`,
        )
        .join("")}</div>`,
    );
  }
  if (trust.privacySummary?.trim() || trust.gdprNotice?.trim()) {
    const privacy = trust.privacySummary?.trim()
      ? `<p class="avx-trust-privacy">${escapeTrustHtml(trust.privacySummary)}${trust.privacyUrl ? ` <a href="${escapeTrustHtml(trust.privacyUrl)}" target="_blank" rel="noopener">Privacy</a>` : ""}</p>`
      : "";
    const gdpr = trust.gdprNotice?.trim()
      ? `<p class="avx-trust-gdpr">${escapeTrustHtml(trust.gdprNotice)}</p>`
      : "";
    parts.push(`<div class="avx-trust-legal">${privacy}${gdpr}</div>`);
  }
  return `<aside class="avx-trust" aria-label="Trust and privacy">${parts.join("")}</aside>`;
}
