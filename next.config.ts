import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['161.97.107.130'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
