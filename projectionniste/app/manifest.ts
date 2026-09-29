import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Projectionniste",
    short_name: "Projectionniste",
    description: "Revue de cinéma personnelle composée à partir de tes notes Letterboxd.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f1ec",
    theme_color: "#c3161c",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
