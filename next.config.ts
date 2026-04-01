import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native Node modules out of the webpack bundle
  serverExternalPackages: ['node:sqlite'],
  images: {
    // Use unoptimized for Cloudflare Pages compatibility
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "alison.com" },
      { protocol: "https", hostname: "learn.microsoft.com" },
      { protocol: "https", hostname: "learn.nvidia.com" },
      { protocol: "https", hostname: "anthropic.com" },
      { protocol: "https", hostname: "huggingface.co" },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
