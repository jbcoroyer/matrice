import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Projectionniste",
    short_name: "Projectionniste",
    description: "Recommandations de films d'après tes notes Letterboxd.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#161616",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
