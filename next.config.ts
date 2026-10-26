import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Let the phone on the same Wi-Fi load the dev server (Next blocks unknown dev origins).
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...lanHosts, "*.trycloudflare.com"],
  // Keep local screen recordings clean.
  devIndicators: false,
  // The service worker must never be served stale, or app updates won't reach installed phones.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // No framing (stops clickjacking the camera page), no MIME sniffing, camera/mic only for us.
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
