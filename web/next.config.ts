import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the cloudflared quick-tunnel origin (random *.trycloudflare.com
  // subdomain each run) to request dev-only assets/HMR; Next.js blocks
  // cross-origin dev requests by default, which otherwise breaks hydration
  // (page renders, but onClick handlers never attach) when testing over a
  // tunnel from a phone.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
