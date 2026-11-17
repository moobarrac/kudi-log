import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build run beside `next dev` without sharing .next (NEXT_DIST_DIR=.next-check npm run build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The share card reads its fonts from disk; make sure Vercel ships them with the function.
  outputFileTracingIncludes: { "/summary/card": ["./assets/fonts/**"] },
  // Next 15 streams metadata into <body> for regular browsers. Chrome only reads the web app manifest
  // (and iOS the apple-* tags) from <head>, so render metadata in <head> for everyone. Ours is static, so it costs nothing.
  htmlLimitedBots: /.*/,
  // The service worker must never be cached by the browser, or fixes to it would take days to reach people.
  async headers() {
    return [
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
