import { GENRE_FR, GENRE_NAME } from "./genres";
import type { Affinity, Credits, Movie } from "./types";

export type Why = { n: string; a: number; r: "réalisation" | "interprétation" | "genre"; id?: number };
export type Prediction = { v: number; why: Why[] };

/** Note TMDB lissée vers 6,4 : un film à 20 votes ne pèse pas autant qu'un film à 20 000. */
export function shrinkVote(m: Movie) {
  const n = m.vote_count || 0;
  const va = m.vote_average || 0;
  return (va * n + 6.4 * 60) / (n + 60);
}

export function genreIds(m: Movie): number[] {
  return m.genre_ids || (m.genres || []).map((g) => g.id);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

/** Note prédite sur 5, et les éléments qui la font bouger. */
export function predict(m: Movie, aff: Affinity, mu: number, credits?: Credits | null): Prediction {
  const why: Why[] = [];
  const ids = genreIds(m);
  const gs = ids.map((id) => GENRE_NAME[id]).filter((g) => g && g in aff.g);
  const g = mean(gs.map((x) => aff.g[x]));
  let d = 0;
  let c = 0;
  if (credits) {
    const dirs = credits.crew.filter((x) => x.job === "Director");
    d = mean(
      dirs
        .filter((x) => x.name in aff.d)
        .map((x) => {
          const a = aff.d[x.name];
          if (Math.abs(a) >= 0.12) why.push({ n: x.name, a, r: "réalisation", id: x.id });
          return a;
        }),
    );
    c = mean(
      credits.cast
        .slice(0, 5)
        .filter((x) => x.name in aff.c)
        .map((x) => {
          const a = aff.c[x.name];
          if (Math.abs(a) >= 0.15) why.push({ n: x.name, a, r: "interprétation", id: x.id });
          return a;
        }),
    );
  }
  for (const x of gs) {
    if (Math.abs(aff.g[x]) >= 0.1) {
      const id = ids.find((i) => GENRE_NAME[i] === x)!;
      why.push({ n: GENRE_FR[id], a: aff.g[x], r: "genre" });
    }
  }
  const v = Math.max(0.5, Math.min(5, mu + 0.25 * (shrinkVote(m) - 7) + 1.2 * g + 0.8 * d + 0.2 * c));
  return { v, why: why.sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).slice(0, 5) };
}

type Acc = Map<string, { s: number; n: number }>;

/**
 * Apprend les affinités à partir des notes : pour chaque réalisateur, acteur ou genre,
 * écart moyen à la note moyenne, lissé par un a priori (k) pour ne pas surréagir à un seul film.
 */
export function learnAffinities(
  films: { rating: number; genres: number[]; directors: string[]; cast: string[] }[],
): { mu: number; aff: Affinity } {
  const mu = mean(films.map((f) => f.rating)) || 3.5;
  const acc = { d: new Map() as Acc, c: new Map() as Acc, g: new Map() as Acc };
  const add = (m: Acc, k: string, x: number) => {
    const e = m.get(k) || { s: 0, n: 0 };
    e.s += x;
    e.n++;
    m.set(k, e);
  };
  for (const f of films) {
    const x = f.rating - mu;
    for (const id of f.genres) if (GENRE_NAME[id]) add(acc.g, GENRE_NAME[id], x);
    for (const n of new Set(f.directors)) add(acc.d, n, x);
    for (const n of new Set(f.cast.slice(0, 5))) add(acc.c, n, x);
  }
  const out = (m: Acc, k: number, minN: number) => {
    const o: Record<string, number> = {};
    for (const [name, e] of m) if (e.n >= minN) o[name] = +(e.s / (e.n + k)).toFixed(3);
    return o;
  };
  return { mu: +mu.toFixed(3), aff: { d: out(acc.d, 2, 1), c: out(acc.c, 4, 2), g: out(acc.g, 10, 1) } };
}
