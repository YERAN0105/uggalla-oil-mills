import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7EE",
    theme_color: "#1B6B3A",
    // Generated from public/logo.jpeg by scripts/generate-icons.ts
    // (npm run generate-icons). Re-run after changing the logo.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
