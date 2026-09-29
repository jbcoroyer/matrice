import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Filmable",
    short_name: "Filmable",
    description: "Ton journal de cinéma, tes critiques, tes listes et des recommandations calées sur tes goûts.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0c0e",
    theme_color: "#0c0c0e",
    lang: "fr",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
