import { KEYS, store } from "./store";
import { tmdb, ApiError } from "./tmdb";
import type { Affinity, Library, Prefs, Profile } from "./types";

export const EMPTY_PREFS: Prefs = { platforms: [], onlyMine: false, hidden: [], wlAdd: [], wlDel: [], seen: {}, titles: {} };

/** Profil de départ livré avec le site (public/seed.json). */
type Seed = {
  owner?: string;
  mu: number;
  aff: Affinity;
  /** identifiants IMDb, tels qu'exportés depuis Letterboxd */
  seen: string[];
  rated: Record<string, number>;
  watchlist: string[];
  /** correspondance déjà résolue (npm run seed) */
  tmdb?: Library;
};

export type Progress = { phase: string; done: number; total: number };

export async function loadSeedProfile(onProgress: (p: Progress) => void): Promise<Profile> {
  const r = await fetch("/seed.json");
  if (!r.ok) throw new Error("Profil de départ introuvable (public/seed.json).");
  const seed = (await r.json()) as Seed;
  const lib = seed.tmdb ?? (await mapImdbLibrary(seed, onProgress));
  return {
    v: 2,
    owner: seed.owner || "",
    source: "seed",
    mu: seed.mu,
    aff: seed.aff,
    lib,
    updatedAt: new Date().toISOString(),
  };
}

/** Relie les identifiants IMDb du profil à TMDB (une seule fois, puis mis en cache). */
async function mapImdbLibrary(seed: Seed, onProgress: (p: Progress) => void): Promise<Library> {
  const map = store.get<Record<string, [number, string] | null>>(KEYS.imdbMap, {});
  const all = [...new Set([...seed.seen, ...seed.watchlist, ...Object.keys(seed.rated)])];
  let done = 0;
  let fatal: unknown = null;
  onProgress({ phase: "Lecture de ton historique", done, total: all.length });
  await Promise.all(
    all.map(async (tt) => {
      if (!(tt in map) && !fatal) {
        try {
          const r = await tmdb<{ movie_results?: { id: number; title: string }[] }>(`find/${tt}`, { external_source: "imdb_id" });
          const m = r.movie_results?.[0];
          map[tt] = m ? [m.id, m.title] : null;
        } catch (e) {
          if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) fatal = e;
        }
      }
      onProgress({ phase: "Lecture de ton historique", done: ++done, total: all.length });
    }),
  );
  store.set(KEYS.imdbMap, map);
  if (fatal) throw fatal;
  const toId = (tt: string) => (map[tt] ? map[tt]![0] : null);
  const titles: Record<string, string> = {};
  for (const tt of all) if (map[tt]) titles[map[tt]![0]] = map[tt]![1];
  const rated: Record<string, number> = {};
  for (const [tt, r] of Object.entries(seed.rated)) {
    const id = toId(tt);
    if (id) rated[id] = r;
  }
  const seen = [...new Set([...seed.seen.map(toId), ...Object.keys(rated).map(Number)].filter((x): x is number => !!x))];
  return { seen, rated, watchlist: seed.watchlist.map(toId).filter((x): x is number => !!x), titles };
}

export function loadStoredProfile(): Profile | null {
  const p = store.get<Profile | null>(KEYS.profile, null);
  return p && p.v === 2 && p.lib && p.aff ? p : null;
}

export function saveProfile(p: Profile) {
  if (!store.set(KEYS.profile, p)) console.warn("Profil trop volumineux pour le stockage local.");
}

export function loadPrefs(): Prefs {
  return { ...EMPTY_PREFS, ...store.get<Partial<Prefs>>(KEYS.prefs, {}) };
}

export function savePrefs(p: Prefs) {
  store.set(KEYS.prefs, p);
}

/** Ensembles effectifs : historique Letterboxd + ce que l'on a fait dans le site. */
export function derive(profile: Profile | null, prefs: Prefs) {
  const lib = profile?.lib ?? { seen: [], rated: {}, watchlist: [], titles: {} };
  const seen = new Set<number>(lib.seen);
  const rated = new Map<number, number>(Object.entries(lib.rated).map(([k, v]) => [+k, +v]));
  for (const [k, r] of Object.entries(prefs.seen)) {
    seen.add(+k);
    if (r > 0) rated.set(+k, r);
  }
  const del = new Set(prefs.wlDel);
  const watchlist = new Set<number>([...lib.watchlist, ...prefs.wlAdd].filter((id) => !del.has(id) && !seen.has(id)));
  const titles = { ...lib.titles, ...prefs.titles };
  return { seen, rated, watchlist, hidden: new Set(prefs.hidden), titles, platforms: new Set(prefs.platforms) };
}

export type Derived = ReturnType<typeof derive>;
