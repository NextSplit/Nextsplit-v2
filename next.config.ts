import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Enable React strict mode for better development warnings
  reactStrictMode: true,
  // Compress responses
  compress: true,
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
