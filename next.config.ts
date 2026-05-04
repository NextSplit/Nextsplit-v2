import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Enable React strict mode for better development warnings
  reactStrictMode: true,
  // Compress responses
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async redirects() {
    return [
      { source: '/squad/', destination: '/squad', permanent: true },
      { source: '/explore/', destination: '/explore', permanent: true },
      { source: '/you/', destination: '/you', permanent: true },
      { source: '/home/', destination: '/home', permanent: true },
      { source: '/train/', destination: '/train', permanent: true },
    ]
  },
  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
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
