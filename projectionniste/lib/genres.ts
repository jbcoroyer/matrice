import type { Movie } from "./types";

/** Noms anglais (IMDb) : ce sont les clés des affinités de genre. */
export const GENRE_NAME: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama",
  10751: "Family", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western", 10770: "TV",
};

export const GENRE_FR: Record<number, string> = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime", 99: "Documentaire", 18: "Drame",
  10751: "Famille", 14: "Fantastique", 36: "Histoire", 27: "Horreur", 10402: "Musique", 9648: "Mystère",
  10749: "Romance", 878: "Science-fiction", 53: "Thriller", 10752: "Guerre", 37: "Western", 10770: "Téléfilm",
};

const NAME_TO_ID = Object.fromEntries(Object.entries(GENRE_NAME).map(([id, n]) => [n, +id]));

/** Genres IMDb sans équivalent TMDB, présents dans les affinités du profil de départ. */
const IMDB_ONLY: Record<string, string> = { Biography: "Biographie", Sport: "Sport", "Film-Noir": "Film noir", Musical: "Comédie musicale" };

export function genreFrFromName(name: string): string {
  const id = NAME_TO_ID[name];
  return id ? GENRE_FR[id] : IMDB_ONLY[name] || name;
}

export const GENRE_OPTIONS = Object.entries(GENRE_FR)
  .filter(([id]) => id !== "10770")
  .map(([id, name]) => ({ id: +id, name }))
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

export function genreIds(m: Movie): number[] {
  return m.genre_ids || (m.genres || []).map((x) => x.id);
}
