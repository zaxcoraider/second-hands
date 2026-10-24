import type { MetadataRoute } from "next";

/** Installable on phones: opens full-screen on the camera pairing page. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/cam",
    name: "Second Hands",
    short_name: "Second Hands",
    description: "An AI that watches your hands while you repair, build or cook, and stops you before you ruin it.",
    start_url: "/cam",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06080B",
    theme_color: "#06080B",
    categories: ["productivity", "utilities", "education"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
