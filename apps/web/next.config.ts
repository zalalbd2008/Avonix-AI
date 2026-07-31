import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Low-RAM machines: SKIP_TYPECHECK=1 npm run build
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1",
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Nested empty package-lock.json files made Turbopack treat the monorepo
  // root as [project], breaking the React Client Manifest for global-error.
  turbopack: {
    root: appRoot,
  },
  /**
   * After deploys, long-lived HTML cache makes the browser request deleted
   * `/_next/static/chunks/*` files → "Failed to load chunk". Keep documents
   * fresh; hashed static assets can stay immutable.
   */
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Cache-Control",
            value:
              "private, no-cache, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
