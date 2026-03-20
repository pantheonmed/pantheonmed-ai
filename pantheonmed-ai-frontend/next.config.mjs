import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output only for Docker/Railway (not for Vercel)
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,

  // Expose API URL to client (VITE_API_URL or NEXT_PUBLIC_API_URL)
  env: {
    VITE_API_URL: process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Explicit webpack alias for @/* — ensures path resolution in production/Docker
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' http://localhost:8000 https://api.pantheonmed.ai https://*.up.railway.app https://pantheonmed-ai-production.up.railway.app",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Image optimization domains
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.pantheonmed.ai" },
    ],
  },
};

export default nextConfig;
