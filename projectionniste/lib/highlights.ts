// Les « highlights » du profil : ce qu'on a le plus vu (réalisateur, acteur, genre, époque) et le film le mieux noté.
// Pas de score ni de prédiction : seulement des décomptes sur les films vus.
import type { Facts } from "./bilan";
import type { SeenFilm } from "./db";
import { num1 } from "./format";
import { GENRE_FR } from "./genres";

export type Highlight = { key: string; label: string; value: string; note: string; href?: string };

type Tally<K> = { key: K; n: number; sum: number; rated: number };

/** Compte les occurrences ; à égalité, la meilleure note moyenne, puis l'ordre alphabétique. */
function tally<K>(items: { key: K; rating: number | null }[], name: (k: K) => string): Tally<K> | null {
  const m = new Map<K, Tally<K>>();
  for (const { key, rating } of items) {
    const t = m.get(key) ?? { key, n: 0, sum: 0, rated: 0 };
    t.n++;
    if (rating) {
      t.sum += rating;
      t.rated++;
    }
    m.set(key, t);
  }
  const avg = (t: Tally<K>) => (t.rated ? t.sum / t.rated : 0);
  return [...m.values()].sort((a, b) => b.n - a.n || avg(b) - avg(a) || name(a.key).localeCompare(name(b.key), "fr"))[0] ?? null;
}

const filmsWord = (n: number) => `${n} film${n > 1 ? "s" : ""} vu${n > 1 ? "s" : ""}`;

/** Ce qui se calcule sans TMDB : genre, époque, film le mieux noté. */
export function quickHighlights(films: SeenFilm[]): Highlight[] {
  const out: Highlight[] = [];
  const genre = tally(films.flatMap((f) => f.genre_ids.filter((g) => GENRE_FR[g]).map((g) => ({ key: g, rating: f.rating }))), (g) => GENRE_FR[g]);
  if (genre) out.push({ key: "genre", label: "Genre le plus vu", value: GENRE_FR[genre.key], note: filmsWord(genre.n) });
  const decade = tally(
    films.filter((f) => f.release_date).map((f) => ({ key: Math.floor(+f.release_date!.slice(0, 4) / 10) * 10, rating: f.rating })),
    String,
  );
  if (decade) out.push({ key: "decade", label: "Époque la plus vue", value: `Années ${decade.key}`, note: filmsWord(decade.n) });
  const best = films
    .filter((f) => f.rating && f.title)
    .sort((a, b) => b.rating! - a.rating! || +b.favorite - +a.favorite || a.title.localeCompare(b.title, "fr"))[0];
  if (best) out.push({ key: "best", label: "Film le mieux noté", value: best.title, note: `${num1(best.rating!)} sur 5`, href: `/film/${best.tmdb_id}` });
  return out;
}

/** Réalisateur et acteur les plus vus, d'après les crédits (mis en cache par filmFacts). */
export function peopleHighlights(films: SeenFilm[], facts: Map<number, Facts>): Highlight[] {
  const out: Highlight[] = [];
  const names = new Map<number, string>();
  const collect = (pick: (f: Facts) => [number, string][]) =>
    films.flatMap((f) => {
      const x = facts.get(f.tmdb_id);
      return x ? pick(x).map(([id, name]) => (names.set(id, name), { key: id, rating: f.rating })) : [];
    });
  const dir = tally(collect((f) => f.d), (id) => names.get(id) ?? "");
  if (dir) out.push({ key: "director", label: "Réalisateur le plus vu", value: names.get(dir.key)!, note: filmsWord(dir.n), href: `/personne/${dir.key}` });
  const act = tally(collect((f) => f.c), (id) => names.get(id) ?? "");
  if (act) out.push({ key: "actor", label: "Acteur ou actrice le plus vu", value: names.get(act.key)!, note: filmsWord(act.n), href: `/personne/${act.key}` });
  return out;
}
