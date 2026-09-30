import { predict } from "./predict";
import { KEYS, store } from "./store";
import { ApiError, tmdb } from "./tmdb";
import type { Derived } from "./profile";
import type { Movie, Paged, Profile, Ranked } from "./types";
import { today } from "./format";

const VERSION = 6;

type Cached = { day: string; v: number; sig: string; list: Ranked[] };

/** Signature de l'historique : la sélection est recalculée quand il change. */
function signature(profile: Profile, d: Derived) {
  return `${profile.updatedAt}|${d.rated.size}|${d.seen.size}`;
}

/**
 * « Pour toi » : agrège les recommandations TMDB des films les mieux notés,
 * pondérées par la note donnée, puis reclasse par indice personnel en limitant
 * le poids de chaque film source pour garder de la diversité.
 */
export async function buildRecs(profile: Profile, d: Derived, { force = false } = {}): Promise<Ranked[]> {
  const sig = signature(profile, d);
  const cached = store.get<Cached | null>(KEYS.recs, null);
  if (!force && cached && cached.day === today() && cached.v === VERSION && cached.sig === sig && cached.list.length)
    return cached.list.filter((m) => !d.seen.has(m.id));

  const { mu, aff } = profile;
  const all = [...d.rated.entries()].sort((a, b) => b[1] - a[1]);
  let seeds = all.filter(([, r]) => r >= 4.5);
  if (seeds.length < 12) seeds = all.slice(0, 40);
  // au plus 60 films de départ, les mieux notés : une requête chacun, inutile d'en faire des centaines
  seeds = seeds.slice(0, 60);

  const agg = new Map<number, { m: Ranked; s: number; from: [number, string, number, number][] }>();
  let fatal: unknown = null;

  if (seeds.length) {
    await Promise.all(
      seeds.map(async ([id, r]) => {
        let res: Paged<Movie>;
        try {
          res = await tmdb<Paged<Movie>>(`movie/${id}/recommendations`, { page: 1 });
        } catch (e) {
          if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) fatal = e;
          return;
        }
        (res.results || []).forEach((m, rank) => {
          if (d.seen.has(m.id) || !m.poster_path || (m.vote_count || 0) < 300) return;
          const w = (r - mu + 0.4) * (1 - rank / 26);
          const e = agg.get(m.id) || { m: { ...m }, s: 0, from: [] };
          e.s += w;
          e.from.push([r, d.titles[id] || "", id, w]);
          agg.set(m.id, e);
        });
      }),
    );
  } else {
    // pas encore de notes : on part des films qui marquent la semaine
    const pages = await Promise.all([1, 2, 3].map((p) => tmdb<Paged<Movie>>("trending/movie/week", { page: p }).catch(() => null)));
    for (const m of pages.flatMap((p) => p?.results ?? []))
      if (!d.seen.has(m.id) && m.poster_path) agg.set(m.id, { m: { ...m }, s: 0, from: [] });
  }
  if (!agg.size && fatal) throw fatal;

  const list = [...agg.values()]
    .map((e) => {
      const p = predict(e.m, aff, mu).v;
      e.m._pred = p;
      e.m._because = e.from
        .slice()
        .sort((a, b) => b[0] - a[0])
        .slice(0, 2)
        .map((x) => x[1])
        .filter(Boolean)
        .join(" et ");
      e.m._score = e.s + 1.1 * (p - mu) + 0.15 * Math.min(e.from.length, 5);
      e.m._seed = e.from.slice().sort((a, b) => b[3] - a[3])[0]?.[2];
      return e.m;
    })
    .sort((a, b) => b._score! - a._score!)
    .slice(0, 320);

  // diversité : aucun film source ne monopolise la sélection
  const used = new Map<number | undefined, number>();
  const out: Ranked[] = [];
  const pool = list.slice();
  while (pool.length && out.length < 160) {
    let bi = 0;
    let bv = -1e9;
    for (let i = 0; i < pool.length; i++) {
      const v = pool[i]._score! - 0.45 * (used.get(pool[i]._seed) || 0);
      if (v > bv) {
        bv = v;
        bi = i;
      }
    }
    const m = pool.splice(bi, 1)[0];
    used.set(m._seed, (used.get(m._seed) || 0) + 1);
    out.push(m);
  }

  const slim = out.map(slimMovie);
  if (slim.length) store.set(KEYS.recs, { day: today(), v: VERSION, sig, list: slim } satisfies Cached);
  return slim;
}

/** Garde seulement ce dont les cartes ont besoin (le cache tient dans le localStorage). */
export function slimMovie(m: Ranked): Ranked {
  const { id, title, original_title, release_date, poster_path, backdrop_path, overview, vote_average, vote_count, genre_ids, _pred, _because, _score, _seed } = m;
  return { id, title, original_title, release_date, poster_path, backdrop_path, overview, vote_average, vote_count, genre_ids, _pred, _because, _score, _seed };
}

export function clearRecs() {
  store.del(KEYS.recs);
}
