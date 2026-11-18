import type { MetadataRoute } from "next";

/** Served at /manifest.webmanifest. Opens straight into Today, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/today",
    name: "Kudi Log",
    short_name: "Kudi Log",
    description: "Type your spending the way you'd say it. Know where your money went, every day.",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F2EC",
    theme_color: "#101412",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Log spending", short_name: "Log", url: "/today?log=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Your day in kudi", short_name: "Summary", url: "/summary" },
    ],
  };
}
