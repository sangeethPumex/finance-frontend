import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Catalyst", short_name: "Catalyst", description: "Personal finance", start_url: "/", display: "standalone",
    background_color: "#ffffff", theme_color: "#ffffff", icons: [{ src: "/catalyst-short.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
