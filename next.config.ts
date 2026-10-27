import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Keep this list in sync with `ALLOWED_IMAGE_HOSTS` in `lib/image-hosts.ts`.
// The list is duplicated here because `next.config.ts` is loaded before the
// TypeScript path aliases and app modules are available.
const ALLOWED_IMAGE_HOSTS = [
  "cdn.sanity.io",
  "images.unsplash.com",
  "plus.unsplash.com",
  "images.pexels.com",
  "avatars.githubusercontent.com",
  "user-images.githubusercontent.com",
  "raw.githubusercontent.com",
  "github.com",
  "res.cloudinary.com",
  "i.imgur.com",
  "imgur.com",
  "media.licdn.com",
  "pbs.twimg.com",
  "lh3.googleusercontent.com",
] as const;

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sanity.io https://*.sentry.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.sanity.io wss://*.sanity.io https://*.sentry.io https://*.ingest.sentry.io",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: false,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 86400,
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: true,
  },
});
