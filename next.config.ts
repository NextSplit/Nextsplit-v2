import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: 'X-Frame-Options',            value: 'DENY' },
  { key: 'X-Content-Type-Options',     value: 'nosniff' },
  { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security',  value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.posthog.com https://browser.sentry-cdn.com https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://app.posthog.com https://sentry.io https://api.resend.com https://www.strava.com https://js.stripe.com",
      "frame-src https://js.stripe.com",
      "frame-ancestors 'none'",
      "worker-src 'self' blob:",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Enable React strict mode for better development warnings
  reactStrictMode: true,
  // Compress responses
  compress: true,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses Sentry CLI output during build
  silent: true,
  // Upload source maps to Sentry for readable stack traces
  widenClientFileUpload: true,
  // Disable the Sentry SDK logger to reduce bundle size
  disableLogger: true,
  // Automatically tree-shake Sentry logger statements
  automaticVercelMonitors: false,
});
