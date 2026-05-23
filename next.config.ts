import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['161.97.107.130'],
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    '/api/market-agent': [
      './node_modules/@anthropic-ai/claude-code/**/*',
      './node_modules/.pnpm/@anthropic-ai+claude-code*/**/*',
    ],
  },
};

export default nextConfig;
