import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  serverExternalPackages: ['node:sqlite'],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "alison.com" },
      { protocol: "https", hostname: "learn.microsoft.com" },
      { protocol: "https", hostname: "learn.nvidia.com" },
      { protocol: "https", hostname: "anthropic.com" },
      { protocol: "https", hostname: "huggingface.co" },
    ],
  },
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
