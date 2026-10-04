import type { NextConfig } from "next";

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

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: ${wordpressOrigin} https://tlu.edu.vn https://www.tlu.edu.vn`,
  `media-src 'self' blob: ${wordpressOrigin}`,
  `connect-src 'self' ${wordpressOrigin}${isProduction ? "" : " ws: wss:"}`,
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
    ],
  },
};

export default nextConfig;
