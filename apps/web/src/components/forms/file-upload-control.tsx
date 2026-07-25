"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormFileConfig } from "@/lib/db/schema";
import {
  formatBytes,
  isImageFile,
  isPdfFile,
  resolveFileConfig,
  validateFiles,
  type FilePreviewItem,
} from "@/lib/forms/file-config";

/**
 * Drag-and-drop file field with image/PDF preview and client validation.
 */
export function FileUploadControl({
  label,
  required,
  fileConfig,
  valueLabel,
  onChange,
  showLabel = true,
}: {
  label?: string;
  required?: boolean;
  fileConfig?: FormFileConfig | null;
  /** Comma-separated file names (preview / values store). */
  valueLabel?: string;
  onChange: (names: string, files: File[]) => void;
  showLabel?: boolean;
}) {
  const cfg = resolveFileConfig(fileConfig);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<FilePreviewItem[]>([]);

  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke on unmount only
  }, []);

  function applyFiles(list: FileList | File[] | null) {
    const files = list ? Array.from(list) : [];
    const err = validateFiles(files, cfg);
    setError(err);
    if (err) {
      onChange("", []);
      setPreviews((prev) => {
        prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
        return [];
      });
      return;
    }
    setPreviews((prev) => {
      prev.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      return files.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        url:
          isImageFile(f) || isPdfFile(f)
            ? URL.createObjectURL(f)
            : undefined,
      }));
    });
    onChange(files.map((f) => f.name).join(", "), files);
  }

  return (
    <div>
      {showLabel && label ? (
        <span className="mb-1.5 block text-[13px] font-semibold" style={{ color: "var(--avx-label)" }}>
          {label}
          {required ? <span style={{ color: "var(--avx-required)" }}> *</span> : null}
        </span>
      ) : null}
      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          applyFiles(e.dataTransfer.files);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "var(--avx-upload-pad, 20px)",
          border:
            "var(--avx-upload-bw, 1px) var(--avx-upload-bs, dashed) var(--avx-upload-border, #dbe1ea)",
          borderRadius: "var(--avx-upload-radius, 10px)",
          background: drag
            ? "var(--avx-upload-drag, rgba(255,102,0,.06))"
            : "var(--avx-upload-bg, #f8fafc)",
          color: "var(--avx-text-muted, #5b6b83)",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          Drop files here or click to upload
        </span>
        <span style={{ fontSize: 11.5 }}>
          {cfg.multiple
            ? `Up to ${cfg.maxFiles} files · max ${cfg.maxSizeMb} MB each`
            : `Max ${cfg.maxSizeMb} MB`}
          {cfg.accept ? ` · ${cfg.accept}` : ""}
        </span>
        {cfg.virusScan ? (
          <span style={{ fontSize: 11 }}>
            Virus scan requested when server supports it
          </span>
        ) : null}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple={cfg.multiple}
          accept={cfg.accept}
          required={required && !valueLabel}
          className="sr-only"
          onChange={(e) => applyFiles(e.target.files)}
        />
      </label>
      {error ? (
        <p className="mt-1.5 text-[12px] font-semibold text-bad">{error}</p>
      ) : null}
      {previews.length > 0 ? (
        <ul className="mt-2.5 flex flex-col gap-2">
          {previews.map((p) => (
            <li
              key={p.name + p.size}
              className="flex items-start gap-2.5 rounded-lg border border-[#e6e9f0] bg-white p-2"
            >
              {p.url && isImageFile(p) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.url}
                  alt=""
                  className="size-14 rounded object-cover"
                />
              ) : p.url && isPdfFile(p) ? (
                <iframe
                  title={p.name}
                  src={p.url}
                  className="h-16 w-14 rounded border border-[#edf0f5]"
                />
              ) : (
                <span className="flex size-14 items-center justify-center rounded bg-[#f1f4f8] text-[11px] font-bold text-faint">
                  FILE
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-ink">
                  {p.name}
                </span>
                <span className="text-[11px] text-faint">
                  {formatBytes(p.size)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : valueLabel ? (
        <p className="mt-1.5 text-[12px] text-faint">{valueLabel}</p>
      ) : null}
    </div>
  );
}
