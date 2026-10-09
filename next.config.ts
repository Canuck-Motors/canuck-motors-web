import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,

  experimental: {
    serverActions: { bodySizeLimit: "12mb" }, // admin photo uploads
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: new URL(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
        ).hostname,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/manufacturers",
        destination: "/brands",
        permanent: true,
      },
      {
        source: "/manufacturers/:slug",
        destination: "/brands/:slug",
        permanent: true,
      },
      {
        source: "/manufacturer/:slug",
        destination: "/brands/:slug",
        permanent: true,
      },
      {
        source: "/auto-parts",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/shop",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/auth/login",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/auth/sign-up",
        destination: "/register",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
