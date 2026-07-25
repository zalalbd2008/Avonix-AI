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
};

export default nextConfig;
