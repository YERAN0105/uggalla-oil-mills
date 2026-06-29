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
