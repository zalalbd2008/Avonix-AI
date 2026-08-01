"use client";

import { useId, useRef, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/15";

const MAX_BYTES = 1.5 * 1024 * 1024;

type ImageUrlFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  className?: string;
  onChange: (next: string) => void;
};

/**
 * URL field + local media picker (file → data URL).
 * Keeps paste-URL support and lets users pick an image from their device.
 */
export function ImageUrlField({
  label,
  value,
  placeholder = "https://…",
  hint,
  className,
  onChange,
}: ImageUrlFieldProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function onPickFile(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP, SVG, GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 1.5 MB. Compress it or use a hosted URL.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError("Could not read that file.");
        return;
      }
      onChange(result);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  }

  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-[12px] font-medium">{label}</span>
      <div className="mt-1 flex gap-2">
        <input
          id={id}
          className={`${inputClass} min-w-0 flex-1`}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            setError(null);
            onChange(e.target.value);
          }}
        />
        <button
          type="button"
          className="shrink-0 rounded-lg border border-line bg-[#f8fafc] px-3 py-2 text-[12px] font-semibold text-ink hover:bg-[#eef2f7]"
          onClick={() => fileRef.current?.click()}
        >
          Media
        </button>
        {value ? (
          <button
            type="button"
            className="shrink-0 rounded-lg border border-line bg-white px-2.5 py-2 text-[12px] text-muted hover:text-ink"
            onClick={() => {
              setError(null);
              onChange("");
              if (fileRef.current) fileRef.current.value = "";
            }}
            title="Clear"
          >
            Clear
          </button>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="sr-only"
        onChange={(e) => {
          onPickFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="mt-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="size-10 rounded-full border border-line object-cover bg-white"
          />
          <span className="text-[11px] text-muted">
            {value.startsWith("data:") ? "From media library" : "Remote URL"}
          </span>
        </div>
      ) : null}
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
      {error ? <p className="mt-1 text-[11px] text-red-600">{error}</p> : null}
    </label>
  );
}
