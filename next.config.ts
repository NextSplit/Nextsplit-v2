import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Enable React strict mode for better development warnings
  reactStrictMode: true,
  // Compress responses
  compress: true,
};

export default nextConfig;
