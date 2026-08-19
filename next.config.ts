import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // React <ViewTransition>: route transitions and shared-element continuity.
    viewTransition: true,
  },
};

export default nextConfig;
