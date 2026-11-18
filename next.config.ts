import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components + Partial Prefetching are the Next.js 16 defaults.
  // Request-time data (cookies, current date, session) must live inside <Suspense>.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  devIndicators: { position: "bottom-right" },
  turbopack: {
    // Kunci root ke folder proyek (ada package-lock.json lain di folder induk mesin lokal).
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
