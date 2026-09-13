import type { NextConfig } from "next";

// Where the FastAPI backend (ai/) listens, e.g. http://localhost:8000.
// Server-side only: the browser never sees it, it calls /api/analyze-food on
// this app and Next.js forwards the request. That keeps phone testing to a
// single tunnel and avoids HTTPS-page -> HTTP-backend mixed content and CORS.
const aiApiOrigin = process.env.AI_API_ORIGIN?.replace(/\/+$/, "");

if (!aiApiOrigin) {
  console.warn(
    "[next.config] AI_API_ORIGIN is not set, so /api/analyze-food will 404 instead of reaching the AI backend.",
  );
}

const nextConfig: NextConfig = {
  // Allow the cloudflared quick-tunnel origin (random *.trycloudflare.com
  // subdomain each run) to request dev-only assets/HMR; Next.js blocks
  // cross-origin dev requests by default, which otherwise breaks hydration
  // (page renders, but onClick handlers never attach) when testing over a
  // tunnel from a phone.
  allowedDevOrigins: ["*.trycloudflare.com"],

  async rewrites() {
    if (!aiApiOrigin) return [];
    return [
      {
        source: "/api/analyze-food",
        destination: `${aiApiOrigin}/api/analyze-food`,
      },
    ];
  },
};

export default nextConfig;
