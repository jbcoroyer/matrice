import type { FilmState, Profile } from "./types";

/** Ensembles utilisés partout dans l'appli, calculés à partir des états de films. */
export function derive(profile: Profile | null, states: Map<number, FilmState>, titles: Record<number, string>) {
  const seen = new Set<number>();
  const rated = new Map<number, number>();
  const watchlist = new Set<number>();
  const favorites = new Set<number>();
  const hidden = new Set<number>();
  for (const [id, s] of states) {
    if (s.watched) seen.add(id);
    if (s.rating) rated.set(id, s.rating);
    if (s.watchlist && !s.watched) watchlist.add(id);
    if (s.favorite) favorites.add(id);
    if (s.hidden) hidden.add(id);
  }
  return { seen, rated, watchlist, favorites, hidden, titles, platforms: new Set<number>(profile?.settings.platforms ?? []) };
}

export type Derived = ReturnType<typeof derive>;
