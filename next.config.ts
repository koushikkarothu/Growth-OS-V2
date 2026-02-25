import type { NextConfig } from "next";

// Setup PWA with Next.js 16 support
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // We keep TypeScript ignore here, it is still supported
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);