import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kabab House POS",
    short_name: "Kabab House",
    description: "POS & management for Kabab House Mardan",
    start_url: "/pos",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#ea580c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
