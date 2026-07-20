import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Bundle the About card-stack photos so the server-side folder read
  // (lib/about-stack.ts) also works in production on Vercel, not just locally.
  outputFileTracingIncludes: {
    "/": ["./public/about-stack/**/*"],
    "/about": ["./public/about-stack/**/*"],
  },
  images: {
    // Trim the generated variants to the widths our layouts actually use.
    // Each unique (image, width, quality, format) is a separate Vercel Image
    // Optimization "transformation"; Next's defaults emit up to 16 widths per
    // image (incl. 2048/3840 4K, rarely needed here). Fewer widths + a single
    // pinned quality ≈ half the transformations. Also lightens Netlify's image
    // CDN if we migrate. No component overrides quality, so [75] is safe.
    deviceSizes: [640, 828, 1080, 1920],
    imageSizes: [64, 128, 256, 384],
    qualities: [75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        // Supabase storage — replace with your project ref
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;
