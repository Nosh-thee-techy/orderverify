/**
 * apps/web/next.config.ts
 * Next.js config. Workspace packages are transpiled, and a strict CSP is sent on every response.
 */
import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appDir, "../..");

// The shared secrets live in the repo-root .env. Next only auto-loads apps/web/.env.
loadEnv({ path: resolve(repoRoot, ".env") });
loadEnv({ path: resolve(appDir, ".env") });

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["@orderverify/engine", "@orderverify/fixtures"],
  // A package-lock.json in the user home would otherwise make Next watch the whole drive.
  outputFileTracingRoot: repoRoot,
  poweredByHeader: false,
  webpack: (config) => {
    // Source files import "./file.js" so TypeScript and Node agree. Webpack needs the .ts alias.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
