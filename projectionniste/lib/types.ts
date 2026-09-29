export type Genre = { id: number; name: string };

export type Movie = {
  id: number;
  title: string;
  original_title?: string;
  original_language?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  tagline?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  runtime?: number | null;
  genre_ids?: number[];
  genres?: Genre[];
  production_countries?: { iso_3166_1: string; name: string }[];
};

export type CastMember = { id: number; name: string; character?: string; profile_path?: string | null; order?: number };
export type CrewMember = { id: number; name: string; job: string; department?: string; profile_path?: string | null };
export type Credits = { cast: CastMember[]; crew: CrewMember[] };

export type Video = { key: string; site: string; type: string; iso_639_1?: string; name?: string; official?: boolean };

export type Provider = { provider_id: number; provider_name: string; logo_path: string; display_priority?: number };
export type ProviderOffers = { link?: string; flatrate?: Provider[]; free?: Provider[]; ads?: Provider[]; rent?: Provider[]; buy?: Provider[] };

export type MovieDetail = Movie & {
  credits: Credits;
  videos?: { results: Video[] };
  recommendations?: { results: Movie[] };
  similar?: { results: Movie[] };
  external_ids?: { imdb_id?: string | null };
  release_dates?: { results: { iso_3166_1: string; release_dates: { certification: string; type: number; release_date: string }[] }[] };
  "watch/providers"?: { results: Record<string, ProviderOffers> };
};

export type Paged<T> = { page: number; results: T[]; total_pages: number; total_results: number };

export type Person = {
  id: number;
  name: string;
  biography?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  profile_path?: string | null;
  known_for_department?: string;
  imdb_id?: string | null;
};

export type PersonCredit = Movie & { character?: string; job?: string; department?: string };
export type PersonCredits = { cast: PersonCredit[]; crew: PersonCredit[] };

/** Affinités apprises à partir des notes : écart moyen (lissé) à la note moyenne. */
export type Affinity = {
  /** réalisateurs */
  d: Record<string, number>;
  /** acteurs (5 premiers rôles) */
  c: Record<string, number>;
  /** genres (noms anglais, cf. GENRE_NAME) */
  g: Record<string, number>;
};

/** Historique Letterboxd, exprimé en identifiants TMDB. */
export type Library = {
  seen: number[];
  rated: Record<string, number>;
  watchlist: number[];
  titles: Record<string, string>;
};

export type Profile = {
  v: 2;
  owner: string;
  source: "seed" | "letterboxd";
  mu: number;
  aff: Affinity;
  lib: Library;
  updatedAt: string;
};

/** Ce que l'on fait dans le site, par-dessus l'historique Letterboxd. */
export type Prefs = {
  platforms: number[];
  onlyMine: boolean;
  hidden: number[];
  wlAdd: number[];
  wlDel: number[];
  /** films marqués vus ici : id → note (0 = pas de note) */
  seen: Record<string, number>;
  titles: Record<string, string>;
};

/** Film enrichi pour l'affichage (indice prédit, raison de la recommandation). */
export type Ranked = Movie & { _pred?: number; _because?: string; _score?: number; _seed?: number; _note?: string };
