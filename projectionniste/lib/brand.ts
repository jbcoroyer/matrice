// Identité de l'appli et informations légales : un seul endroit à modifier au moment du choix du nom
// et de la mise en ligne. Tout ce qui est entre crochets [ ] est à compléter avant le lancement.

export const BRAND = {
  /** nom affiché ; `strong` + `light` forment le mot-marque en deux graisses */
  name: "Filmable",
  strong: "Film",
  light: "able",
  tagline: "Vois et possède les films qui comptent.",
  description: "Ton carnet de cinéma : ce que tu as vu, ce que tu possèdes, et par quoi continuer. Journal, parcours, collection, import Letterboxd.",
  /** adresse du site, sans « / » final (vide tant que le domaine n'est pas choisi) */
  url: "",
};

export const LEGAL = {
  updated: "1er octobre 2026",
  editor: {
    name: "[Prénom et nom de l'éditeur]",
    status: "personne physique, à titre non professionnel",
    address: "[adresse postale de l'éditeur]",
    email: "[adresse email de contact]",
  },
  host: {
    site: { name: "Vercel Inc.", address: "[adresse de l'hébergeur à vérifier sur vercel.com]", url: "https://vercel.com" },
    data: { name: "Supabase Inc.", region: "[région de la base de données : Union européenne]", url: "https://supabase.com" },
    email: { name: "[service d'envoi des emails]" },
  },
};

/** Vrai tant qu'il reste un champ entre crochets à compléter (affiché en surbrillance sur les pages légales). */
export const todo = (v: string) => v.startsWith("[") && v.endsWith("]");
