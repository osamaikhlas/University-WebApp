import type { NextConfig } from "next";

/**
 * Baseline security headers, applied to every response (security review, 2026-09-15).
 *
 * No nonce-based CSP: that requires a Proxy file generating a fresh nonce per request and
 * forcing every route to dynamic rendering (see node_modules/next/dist/docs' CSP guide) — a
 * much larger structural change than this review's actual XSS exposure justifies, since this
 * app already auto-escapes everything through React and has exactly one
 * `dangerouslySetInnerHTML` call (JSON-LD, itself `<`-escaped — see src/lib/seo.ts). `script-src`/
 * `style-src` need `'unsafe-inline'` because Next.js's own hydration payload and one dynamic
 * `style={{ width }}` progress bar (src/app/admin/compliance/[id]/page.tsx) both rely on it;
 * everything else in this policy is a real, meaningful restriction (no external script/frame/
 * object sources, no clickjacking, no plaintext-downgrade).
 */
const isProduction = process.env.NODE_ENV === "production";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=()",
  },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
