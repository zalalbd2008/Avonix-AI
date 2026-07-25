import type { FormFileConfig } from "@/lib/db/schema";

export const DEFAULT_FILE_CONFIG: Required<
  Pick<FormFileConfig, "multiple" | "accept" | "maxSizeMb" | "maxFiles" | "virusScan">
> = {
  multiple: false,
  accept: "image/*,.pdf,.doc,.docx,.zip",
  maxSizeMb: 10,
  maxFiles: 5,
  virusScan: false,
};

export function resolveFileConfig(
  raw?: FormFileConfig | null,
): Required<typeof DEFAULT_FILE_CONFIG> {
  return {
    multiple: Boolean(raw?.multiple),
    accept: (raw?.accept?.trim() || DEFAULT_FILE_CONFIG.accept).slice(0, 200),
    maxSizeMb: clampNum(raw?.maxSizeMb, 1, 100, DEFAULT_FILE_CONFIG.maxSizeMb),
    maxFiles: clampNum(raw?.maxFiles, 1, 20, DEFAULT_FILE_CONFIG.maxFiles),
    virusScan: Boolean(raw?.virusScan),
  };
}

function clampNum(
  v: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(file: { type?: string; name?: string }): boolean {
  if (file.type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name ?? "");
}

export function isPdfFile(file: { type?: string; name?: string }): boolean {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name ?? "");
}

/** Validate a FileList against config; returns error message or null. */
export function validateFiles(
  files: File[],
  cfg: ReturnType<typeof resolveFileConfig>,
): string | null {
  if (!files.length) return null;
  if (cfg.multiple && files.length > cfg.maxFiles) {
    return `You can upload at most ${cfg.maxFiles} files.`;
  }
  if (!cfg.multiple && files.length > 1) {
    return "Only one file is allowed.";
  }
  const maxBytes = cfg.maxSizeMb * 1024 * 1024;
  for (const file of files) {
    if (file.size > maxBytes) {
      return `${file.name} is larger than ${cfg.maxSizeMb} MB.`;
    }
  }
  return null;
}

export type FilePreviewItem = {
  name: string;
  size: number;
  type: string;
  /** Object URL for image/pdf preview (revoke when done). */
  url?: string;
};
