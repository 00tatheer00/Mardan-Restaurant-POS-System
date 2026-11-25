import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // All pages are per-user (auth cookies), so no static prerendering / component caching.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
