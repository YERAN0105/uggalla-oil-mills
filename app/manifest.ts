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
    // Uses the existing logo asset. Replace with purpose-built square PNG icons
    // (192/512 + maskable) before launch — see docs/README "Favicons & PWA icons".
    icons: [
      { src: "/logo.jpeg", sizes: "192x192", type: "image/jpeg" },
      { src: "/logo.jpeg", sizes: "512x512", type: "image/jpeg" },
    ],
  };
}
