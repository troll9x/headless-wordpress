import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import { GA_MEASUREMENT_ID } from "./src/config/analytics";

function releaseId(): string {
  const configured = process.env.TLU_RELEASE_ID ?? process.env.GITHUB_SHA;
  if (configured && /^[0-9a-f]{7,40}$/i.test(configured)) return configured.slice(0, 12);

  try {
    return execFileSync("git", ["rev-parse", "--short=12", "HEAD"], {
      encoding: "utf8",
      timeout: 2_000,
      windowsHide: true,
    }).trim();
  } catch {
    return "unversioned";
  }
}

const isProduction = process.env.NODE_ENV === "production";
const wordpressBaseUrl = process.env.NEXT_PUBLIC_WP_BASE_URL?.trim();

if (!wordpressBaseUrl) {
  throw new Error(
    "Missing required environment variable: NEXT_PUBLIC_WP_BASE_URL",
  );
}

const wordpressUrl = new URL(wordpressBaseUrl);

if (wordpressUrl.protocol !== "http:" && wordpressUrl.protocol !== "https:") {
  throw new Error(
    "Environment variable NEXT_PUBLIC_WP_BASE_URL must use HTTP or HTTPS.",
  );
}

const wordpressOrigin = wordpressUrl.origin;
const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const enableAnalytics = isProduction
  && publicSiteUrl != null
  && new URL(publicSiteUrl).hostname === "tlu.edu.vn"
  && /^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID);
const analyticsScriptSource = enableAnalytics ? " https://www.googletagmanager.com" : "";
const analyticsImageSources = enableAnalytics ? " https://www.googletagmanager.com https://*.google-analytics.com" : "";
const analyticsConnectSources = enableAnalytics ? " https://www.googletagmanager.com https://*.google-analytics.com https://*.google.com" : "";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}${analyticsScriptSource}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: ${wordpressOrigin} https://tlu.edu.vn https://www.tlu.edu.vn https://secure.gravatar.com${analyticsImageSources}`,
  `media-src 'self' blob: ${wordpressOrigin}`,
  `connect-src 'self' ${wordpressOrigin}${isProduction ? "" : " ws: wss:"}${analyticsConnectSources}`,
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  isProduction ? "upgrade-insecure-requests" : "",
].filter(Boolean).join("; ");

const securityHeaders = [
  { key: "X-TLU-Release", value: releaseId() },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  ...(isProduction
    ? [{
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  images: {
    // The active WordPress media host is loaded from .env.local above.
    // Keep remotePatterns narrow so Next can generate responsive variants.
    remotePatterns: [
      {
        protocol: wordpressUrl.protocol === "https:" ? "https" : "http",
        hostname: wordpressUrl.hostname,
        port: wordpressUrl.port,
      },
      {
        protocol: "https",
        hostname: "tlu.edu.vn",
      },
      {
        protocol: "https",
        hostname: "www.tlu.edu.vn",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/avatar/**",
      },
    ],
  },
};

export default nextConfig;
