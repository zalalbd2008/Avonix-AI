/**
 * Resolve a pasted form link into either a native Form Builder id
 * or an external iframe embed URL.
 */

const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

const SHORTCODE_RE = /\[avonix_form[^\]]*id=["']?(\d+)["']?[^\]]*\]/i;

export type FormLinkOption = {
  id: string;
  name: string;
  formNumber?: number;
};

export type ResolvedFormLink =
  | { kind: "formId"; formId: string; label: string }
  | { kind: "embedUrl"; url: string }
  | { kind: "empty" }
  | { kind: "invalid"; message: string };

function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Avonix admin / preview paths that contain a form UUID. */
function extractFormIdFromPath(input: string): string | null {
  const pathMatch = input.match(/\/forms\/([0-9a-f-]{36})(?:\/|$|\?|#)/i);
  if (pathMatch?.[1]) return pathMatch[1].toLowerCase();
  const bare = input.trim();
  if (UUID_RE.test(bare) && bare.length <= 40) {
    const m = bare.match(UUID_RE);
    return m ? m[0].toLowerCase() : null;
  }
  const any = input.match(UUID_RE);
  return any ? any[0].toLowerCase() : null;
}

export function resolveFormLink(
  raw: string,
  forms: FormLinkOption[],
): ResolvedFormLink {
  const input = raw.trim();
  if (!input) return { kind: "empty" };

  const shortcode = input.match(SHORTCODE_RE);
  if (shortcode?.[1]) {
    const num = Number(shortcode[1]);
    const hit = forms.find((f) => f.formNumber === num);
    if (hit) {
      return { kind: "formId", formId: hit.id, label: hit.name };
    }
    return {
      kind: "invalid",
      message: `No Form Builder form with shortcode id ${num} on this website.`,
    };
  }

  const formId = extractFormIdFromPath(input);
  if (formId) {
    const hit = forms.find((f) => f.id.toLowerCase() === formId);
    if (hit) {
      return { kind: "formId", formId: hit.id, label: hit.name };
    }
    // UUID looks like ours but not on this site — still try native if exact id
    if (forms.some((f) => f.id === formId)) {
      const f = forms.find((x) => x.id === formId)!;
      return { kind: "formId", formId: f.id, label: f.name };
    }
    return {
      kind: "invalid",
      message:
        "That form link is not on this website. Pick a form from the list or paste an external form URL.",
    };
  }

  const byNumber = /^\d{1,6}$/.test(input) ? Number(input) : NaN;
  if (!Number.isNaN(byNumber)) {
    const hit = forms.find((f) => f.formNumber === byNumber);
    if (hit) {
      return { kind: "formId", formId: hit.id, label: hit.name };
    }
  }

  const byName = forms.find(
    (f) => f.name.toLowerCase() === input.toLowerCase(),
  );
  if (byName) {
    return { kind: "formId", formId: byName.id, label: byName.name };
  }

  const url = normalizeHttpUrl(input);
  if (url) {
    return { kind: "embedUrl", url };
  }

  return {
    kind: "invalid",
    message:
      "Paste a Form Builder link, form UUID, [avonix_form id=\"N\"], or any https form URL.",
  };
}

export function isSafeEmbedUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
