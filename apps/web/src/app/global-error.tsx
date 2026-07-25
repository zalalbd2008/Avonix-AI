"use client";

/**
 * Root error boundary (required for App Router). Also anchors Turbopack's
 * client manifest for the built-in global-error entry (Next 16).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
          {error.message || "Unexpected application error."}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#ff6600",
            border: 0,
            borderRadius: 8,
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            padding: "10px 14px",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
