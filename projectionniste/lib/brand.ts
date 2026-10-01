// Identité de l'appli et informations légales : un seul endroit à modifier au moment du choix du nom
// et de la mise en ligne. Tout ce qui est entre crochets [ ] est à compléter avant le lancement.

export const BRAND = {
  /** nom affiché ; `strong` + `light` forment le mot-marque en deux graisses */
  name: "Fillmography",
  strong: "Fill",
  light: "mography",
  tagline: "Vois et possède les films qui comptent.",
  description: "Ton carnet de cinéma : ce que tu as vu, ce que tu possèdes, et par quoi continuer. Journal, parcours, collection, import Letterboxd.",
  /** adresse du site, sans « / » final (vide tant que le domaine n'est pas choisi) */
  url: "",
};

export const LEGAL = {
  updated: "1er octobre 2026",
  editor: {
    name: "Jean-Baptiste Coroyer",
    status: "entrepreneur individuel (SIREN 849 479 282)",
    address: "2 chemin du Chai, 44240 La Chapelle-sur-Erdre, France",
    email: "jeanbaptisteco@gmail.com",
  },
  /** durée maximale pendant laquelle une copie de sauvegarde peut subsister après une suppression */
  backups: "30 jours au plus",
  host: {
    site: { name: "Vercel Inc.", address: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis", url: "https://vercel.com" },
    data: { name: "Supabase Inc.", region: "Irlande (Union européenne)", url: "https://supabase.com" },
    email: { name: "Supabase (envoi des emails d'authentification)" },
  },
};

/** Vrai tant qu'il reste un champ entre crochets à compléter (affiché en surbrillance sur les pages légales). */
export const todo = (v: string) => v.startsWith("[") && v.endsWith("]");
