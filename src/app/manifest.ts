import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Catalyst", short_name: "Catalyst", description: "Personal finance", start_url: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#ffffff", icons: [
      { src: "/catalyst-short.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
