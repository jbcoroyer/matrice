// Découvrir : ce que Filmable te propose, et pourquoi.
// Aucune note prédite : chaque proposition s'appuie sur un fait vérifiable (ton dernier film,
// un cycle en cours, ta collection, un anniversaire) ou sur une sélection écrite à la main.
// Les tirages sont déterministes (graine = jour + compte) : la page change chaque jour, pas à chaque visite.
import type { SupabaseClient } from "@supabase/supabase-js";
import { filmFacts } from "./bilan";
import { formatLabel, type Format } from "./collection";
import { loadWatchlistFilms } from "./db";
import { EDITORIAL, type EditorialDef } from "./editorial";
import { frDate, plural, runtime } from "./format";
import { PICKS } from "./picks";
import { cachedEditorial, followedIn, mySets, personFilms, personKey, resolveDef, resolveFilms, setItems, upcoming, type SetFilm } from "./sets";
import { store } from "./store";
import { check } from "./supabase";
import { mapLimit, tmdb } from "./tmdb";
import type { Movie, Paged, PersonCredits } from "./types";

/* ---------- hasard reproductible ---------- */

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Suite pseudo-aléatoire : la même graine donne toujours la même suite. */
export function seeded(seed: string) {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], r: () => number): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** La date du jour, dans le fuseau de l'utilisateur. */
export const localDay = () => new Date().toLocaleDateString("sv-SE");

const DAY = 86400000;
const yearOf = (d?: string | null) => (d || "").slice(0, 4);
const notable = (a: Movie, b: Movie) => (b.vote_count ?? 0) - (a.vote_count ?? 0);

/* ---------- ce que Découvrir sait de toi ---------- */

export type Ctx = {
  sb: SupabaseClient;
  userId: string;
  seen: Set<number>;
  rated: Map<number, number>;
  watchlist: Set<number>;
  owned: Map<number, Format[]>;
  titles: Record<number, string>;
};

export type Recent = { tmdb_id: number; watched_on: string };

/** Les derniers visionnages datés du journal, du plus récent au plus ancien (un par film). */
export async function recentViews(sb: SupabaseClient, userId: string): Promise<Recent[]> {
  const rows = check(
    await sb
      .from("diary_entries")
      .select("tmdb_id, watched_on")
      .eq("user_id", userId)
      .not("watched_on", "is", null)
      .order("watched_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(40),
  ) as Recent[];
  const seen = new Set<number>();
  return rows.filter((r) => !seen.has(r.tmdb_id) && (seen.add(r.tmdb_id), true));
}

/** Depuis quand chaque film est dans la watchlist. */
export async function watchlistDates(sb: SupabaseClient): Promise<Map<number, string>> {
  let res = await sb.from("user_films").select("tmdb_id, watchlisted_at, updated_at").eq("watchlist", true).eq("watched", false).limit(2000);
  // base sans la colonne watchlisted_at (migration pas encore passée) : la date de mise à jour suffit
  if (res.error) res = (await sb.from("user_films").select("tmdb_id, updated_at").eq("watchlist", true).eq("watched", false).limit(2000)) as typeof res;
  const rows = check(res) as { tmdb_id: number; watchlisted_at?: string | null; updated_at: string }[];
  return new Map(rows.map((r) => [r.tmdb_id, r.watchlisted_at || r.updated_at]));
}

/** « samedi », « hier », « le 12 septembre ». */
export function when(iso: string) {
  const d = new Date(iso + "T12:00:00");
  const days = Math.round((new Date(localDay() + "T12:00:00").getTime() - d.getTime()) / DAY);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return d.toLocaleDateString("fr-FR", { weekday: "long" });
  return `le ${frDate(iso, { day: "numeric", month: "long" })}`;
}

/** « 5 mois », « plus d'un an », « 3 ans ». */
export function ago(iso: string) {
  const days = (Date.now() - new Date(iso).getTime()) / DAY;
  if (days < 14) return "quelques jours";
  if (days < 60) return `${Math.round(days / 7)} semaines`;
  if (days < 365) return `${Math.round(days / 30.4)} mois`;
  const y = Math.floor(days / 365);
  return y === 1 ? "plus d'un an" : `${y} ans`;
}

/* ---------- Aujourd'hui : une proposition, avec sa raison ---------- */

/** Morceau de phrase : du texte, ou un lien [texte, adresse]. */
export type Part = string | [string, string];

export type Proposal = {
  id: number;
  kind: "cycle" | "director" | "owned" | "watchlist" | "anniversary" | "pick";
  kicker: string;
  why: Part[];
  /** lien vers ce qui a motivé la proposition (le cycle, le rayon…) */
  more?: [string, string];
};

type Gen = (exclude: Set<number>) => Promise<Proposal | null>;

/** Le film à retenir dans un ensemble : le plus connu de ceux que tu n'as pas vus. */
export function nextIn<T extends Movie>(films: T[], seen: Set<number>, not?: number): T | null {
  return films.filter((m) => !seen.has(m.id) && m.id !== not && !upcoming(m)).sort(notable)[0] ?? null;
}

/** Les longs métrages réalisés par une personne, sortis, sans doublon. */
async function directed(personId: number): Promise<PersonCredits["crew"]> {
  const c = await tmdb<PersonCredits>(`person/${personId}/movie_credits`);
  const films = personFilms(c, "director").filter((m) => !upcoming(m));
  return [...new Map(films.map((m) => [m.id, m])).values()];
}

function generators(ctx: Ctx, recent: Recent[], dates: Map<number, string>, day: string): Record<Proposal["kind"], Gen> {
  const r = seeded(`${day}|${ctx.userId}`);
  const fresh = (id: number, ex: Set<number>) => !ctx.seen.has(id) && !ex.has(id);
  const pickOrder = shuffle(PICKS.map((_, i) => i), seeded(`${day}|${ctx.userId}|picks`));
  let pickAt = 0;

  return {
    // la suite d'un cycle en cours
    async cycle(ex) {
      const sets = (await mySets(ctx.sb)).filter((s) => s.follows.some((f) => f.mode === "watch" && !f.completed_at && !f.archived_at));
      if (!sets.length) return null;
      const cycles = followedIn(sets, await setItems(ctx.sb, sets.map((s) => s.id)), "watch");
      for (const c of shuffle(cycles, r)) {
        const next = c.films.find((f) => fresh(f.tmdb_id, ex));
        if (!next) continue;
        const done = c.films.filter((f) => ctx.seen.has(f.tmdb_id)).length;
        return {
          id: next.tmdb_id,
          kind: "cycle",
          kicker: "Ton cycle",
          why: [["« " + c.set.title + " »", `/parcours?p=${c.set.key}`], ` : ${done} ${done > 1 ? "séances" : "séance"} sur ${c.films.length}. La suivante :`],
        };
      }
      return null;
    },

    // le même cinéaste que ton dernier film (s'il t'a plu)
    async director(ex) {
      const last = recent.find((v) => Date.now() - new Date(v.watched_on).getTime() < 45 * DAY && (ctx.rated.get(v.tmdb_id) ?? 3.5) >= 3);
      if (!last) return null;
      const facts = await filmFacts([last.tmdb_id], () => {});
      const dir = facts.get(last.tmdb_id)?.d[0];
      if (!dir) return null;
      const next = nextIn(await directed(dir[0]), new Set([...ctx.seen, ...ex]), last.tmdb_id);
      if (!next) return null;
      const title = ctx.titles[last.tmdb_id] || "ton dernier film";
      return {
        id: next.id,
        kind: "director",
        kicker: "Pour continuer",
        why: ["Tu as vu ", [title, `/film/${last.tmdb_id}`], ` ${when(last.watched_on)}. `, [dir[1], `/personne/${dir[0]}`], ` a aussi réalisé, en ${yearOf(next.release_date)} :`],
        more: ["Tous ses films", `/ensembles/${personKey(dir[0], "director")}`],
      };
    },

    // un film de ta collection que tu n'as jamais vu
    async owned(ex) {
      const ids = shuffle([...ctx.owned.keys()].filter((id) => fresh(id, ex)), r);
      if (!ids.length) return null;
      const f = ctx.owned.get(ids[0])!;
      return { id: ids[0], kind: "owned", kicker: "Sur ton étagère", why: [`Il est dans ta collection en ${formatLabel(f[0])}, et tu ne l'as pas encore vu.`], more: ["Ta collection", "/collection"] };
    },

    // un film qui attend depuis longtemps dans la watchlist
    async watchlist(ex) {
      const oldest = [...dates.entries()].filter(([id]) => fresh(id, ex)).sort((a, b) => a[1].localeCompare(b[1])).slice(0, 12);
      if (!oldest.length) return null;
      const [id, at] = shuffle(oldest, r)[0];
      return { id, kind: "watchlist", kicker: "Dans ta watchlist", why: [`Il t'attend depuis ${ago(at)}.`], more: ["Ta watchlist", "/journal?onglet=avoir"] };
    },

    // sorti il y a 25, 30, 40, 50 ou 60 ans, cette semaine
    async anniversary(ex) {
      const now = new Date(localDay() + "T12:00:00");
      for (const n of shuffle([25, 30, 40, 50, 60], r)) {
        const at = new Date(now);
        at.setFullYear(now.getFullYear() - n);
        const iso = (t: number) => new Date(at.getTime() + t * DAY).toISOString().slice(0, 10);
        const res = await tmdb<Paged<Movie>>("discover/movie", {
          "primary_release_date.gte": iso(-3),
          "primary_release_date.lte": iso(3),
          sort_by: "vote_count.desc",
          "vote_count.gte": n >= 40 ? 150 : 400,
          without_genres: "99,10770",
        }).catch(() => null);
        // on vérifie la date : la phrase doit être vraie
        const hit = (res?.results ?? []).find((m) => {
          if (!m.poster_path || !m.release_date || !fresh(m.id, ex)) return false;
          const d = new Date(m.release_date + "T12:00:00");
          d.setFullYear(d.getFullYear() + n);
          return Math.abs(d.getTime() - now.getTime()) <= 4 * DAY;
        });
        if (hit) return { id: hit.id, kind: "anniversary", kicker: "Anniversaire", why: [`Sorti le ${frDate(hit.release_date)}, il y a ${n} ans cette semaine.`] };
      }
      return null;
    },

    // un coup de cœur écrit à la main
    async pick(ex) {
      for (let tries = 0; tries < 6 && pickAt < pickOrder.length; tries++) {
        const [q, year, hook] = PICKS[pickOrder[pickAt++]];
        const res = await tmdb<Paged<Movie>>("search/movie", { query: q, year }).catch(() => null);
        const hit = res?.results?.find((m) => yearOf(m.release_date) === String(year)) ?? res?.results?.[0];
        if (hit && fresh(hit.id, ex) && !ctx.watchlist.has(hit.id)) return { id: hit.id, kind: "pick", kicker: "Coup de cœur", why: [hook] };
      }
      return null;
    },
  };
}

const TODAY_KEY = "projo.today.v1";
type TodayCache = { key: string; list: Proposal[] };

/**
 * Trois propositions pour la journée, de trois natures : continuer (cycle, cinéaste du dernier film),
 * découvrir (coup de cœur, anniversaire), ressortir ce que tu as déjà (collection, watchlist).
 * Recalculées le lendemain, ou dès qu'un film est vu.
 */
export async function buildToday(ctx: Ctx): Promise<Proposal[]> {
  const day = localDay();
  const recent = await recentViews(ctx.sb, ctx.userId).catch(() => [] as Recent[]);
  const key = `${day}|${ctx.userId}|${ctx.seen.size}|${recent[0]?.tmdb_id ?? 0}`;
  const cached = store.get<TodayCache | null>(TODAY_KEY, null);
  if (cached?.key === key && cached.list.length) return cached.list;

  const dates = await watchlistDates(ctx.sb).catch(() => new Map<number, string>());
  const g = generators(ctx, recent, dates, day);
  const r = seeded(`${day}|${ctx.userId}|slots`);
  const either = <T>(a: T, b: T) => (r() < 0.5 ? [a, b] : [b, a]);
  const known = ctx.seen.size >= 5;
  const slots: Gen[][] = known
    ? [[...either(g.director, g.cycle), g.pick], [...either(g.pick, g.anniversary)], [...either(g.owned, g.watchlist), g.pick]]
    : [[g.pick], [g.anniversary, g.pick], [g.watchlist, g.owned, g.pick]];
  const out: Proposal[] = [];
  const taken = new Set<number>();
  for (const slot of slots) {
    for (const gen of slot) {
      const p = await gen(taken).catch(() => null);
      if (p && !taken.has(p.id)) {
        out.push(p);
        taken.add(p.id);
        break;
      }
    }
  }
  if (out.length) store.set(TODAY_KEY, { key, list: out } satisfies TodayCache);
  return out;
}

/* ---------- Chemins : trois portes vers un cinéaste, un mouvement, un pays ---------- */

export type Door = {
  key: string;
  kind: "director" | "near" | "far" | "entry" | "saga";
  kicker: string;
  title: string;
  why: string;
  href: string;
  next: { id: number; title: string; year: string } | null;
  nextLabel: string;
  still: string | null;
};

const doorNext = (m: Movie | null) => (m ? { id: m.id, title: m.title, year: yearOf(m.release_date) } : null);
const stillOf = (films: Movie[], next: Movie | null) => next?.backdrop_path ?? films.find((m) => m.backdrop_path)?.backdrop_path ?? null;

/** Les sélections qui peuvent servir de chemin (pas les sagas : trop courtes, trop connues). */
const PATHS = EDITORIAL.filter((e) => e.films && e.family !== "Sagas");
const span = (e: EditorialDef) => {
  const ys = (e.films ?? []).map((f) => f[1]);
  return [Math.min(...ys), Math.max(...ys)] as const;
};

async function editorialFilms(e: EditorialDef): Promise<SetFilm[]> {
  const cached = cachedEditorial(e.key);
  if (cached) return cached;
  const def = await resolveDef(e.key);
  return def ? (await resolveFilms(def)).filter((m) => !upcoming(m)) : [];
}

async function editorialDoor(e: EditorialDef, ctx: Ctx, kind: Door["kind"], why: (k: number, n: number) => string, kicker: string): Promise<Door | null> {
  const films = (await editorialFilms(e)).filter((m) => !upcoming(m));
  if (!films.length) return null;
  const k = films.filter((m) => ctx.seen.has(m.id)).length;
  const next = nextIn(films, ctx.seen);
  if (!next) return null;
  return { key: e.key, kind, kicker, title: e.title, why: why(k, films.length), href: `/ensembles/${e.key}`, next: doorNext(next), nextLabel: k ? "Et ensuite" : "Par où commencer", still: stillOf(films, next) };
}

/** Le cinéaste que tu regardes le plus (d'après tes derniers films et tes mieux notés) et dont il te reste des films. */
async function directorDoor(ctx: Ctx, recent: Recent[], avoid: number | null): Promise<Door | null> {
  const top = [...ctx.rated.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id]) => id);
  const ids = [...new Set([...recent.slice(0, 15).map((v) => v.tmdb_id), ...top])].filter((id) => ctx.seen.has(id));
  if (!ids.length) return null;
  const facts = await filmFacts(ids, () => {});
  const tally = new Map<number, { name: string; n: number; w: number }>();
  for (const id of ids)
    for (const [pid, name] of facts.get(id)?.d ?? []) {
      const t = tally.get(pid) ?? { name, n: 0, w: 0 };
      t.n++;
      t.w += (ctx.rated.get(id) ?? 3) - 2.5;
      tally.set(pid, t);
    }
  const cands = [...tally.entries()].filter(([pid, t]) => pid !== avoid && t.w > 0).sort((a, b) => b[1].n - a[1].n || b[1].w - a[1].w).slice(0, 3);
  for (const [pid, t] of cands) {
    const films = await directed(pid).catch(() => []);
    if (films.length < 3) continue;
    const next = nextIn(films, ctx.seen);
    const k = films.filter((m) => ctx.seen.has(m.id)).length;
    // la phrase « tu as vu k de ses films » doit être vraie
    if (!next || !k) continue;
    return {
      key: `director-${pid}`,
      kind: "director",
      kicker: "Un cinéaste",
      title: t.name,
      why: `Tu as vu ${k} de ses ${films.length} films.`,
      href: `/ensembles/${personKey(pid, "director")}`,
      next: doorNext(next),
      nextLabel: "Et ensuite",
      still: stillOf(films, next),
    };
  }
  return null;
}

export type SeenLite = { release_date: string | null };

const DOORS_KEY = "projo.doors.v1";
type DoorsCache = { key: string; doors: Door[] };

/**
 * Trois chemins : un cinéaste que tu suis déjà, une sélection proche de ce que tu regardes,
 * et un écart assumé vers ce que tu ne regardes jamais. Sans historique : trois portes d'entrée.
 */
export async function buildDoors(ctx: Ctx, seenFilms: SeenLite[], avoidDirector: number | null, skip: string[] = []): Promise<Door[]> {
  const day = localDay();
  const key = `${day}|${ctx.userId}|${ctx.seen.size}|${skip.join(",")}`;
  const cached = store.get<DoorsCache | null>(DOORS_KEY, null);
  if (cached?.key === key && cached.doors.length) return cached.doors;

  const r = seeded(`${day}|${ctx.userId}|doors`);
  const out: Door[] = [];
  // les parcours déjà suivis ne sont pas reproposés
  const used = new Set<string>(skip);
  const add = (d: Door | null) => d && !used.has(d.key) && (out.push(d), used.add(d.key), true);

  if (ctx.seen.size >= 5) {
    const recent = await recentViews(ctx.sb, ctx.userId).catch(() => [] as Recent[]);
    add(await directorDoor(ctx, recent, avoidDirector).catch(() => null));

    // proximité : les années où tu regardes le plus
    const years = seenFilms.map((f) => +yearOf(f.release_date)).filter(Boolean);
    const inSpan = (e: EditorialDef) => {
      const [a, b] = span(e);
      return years.filter((y) => y >= a && y <= b).length;
    };
    const scored = PATHS.map((e) => {
      const [a, b] = span(e);
      return { e, n: inSpan(e), density: inSpan(e) / (b - a + 1) };
    });
    const near = shuffle([...scored].sort((a, b) => b.density - a.density).slice(0, 4), r);
    for (const { e, n } of near) {
      if (!n) continue;
      const [a, b] = span(e);
      const d = await editorialDoor(e, ctx, "near", (k, total) => (k ? `Tu en as vu ${k} sur ${total}.` : `${plural(n, "de tes films est sorti", "de tes films sont sortis")} entre ${a} et ${b}, aucun de ceux-là.`), "Tout près de tes films").catch(() => null);
      if (add(d)) break;
    }
    // écart : ce que tu ne regardes presque jamais
    const far = shuffle([...scored].filter((x) => !used.has(x.e.key)).sort((a, b) => a.n - b.n).slice(0, 4), r);
    for (const { e } of far) {
      const d = await editorialDoor(e, ctx, "far", (k, total) => (k ? `Tu n'en as vu que ${k} sur ${total}.` : `Aucun de ces ${total} films parmi les ${ctx.seen.size} que tu as vus.`), "Un écart").catch(() => null);
      if (d && add(d)) break;
    }
  }

  // portes d'entrée : pour compléter, ou pour un compte qui débute
  const entries = shuffle(PATHS, r).filter((e) => !used.has(e.key));
  const families = new Set(out.map((d) => EDITORIAL.find((e) => e.key === d.key)?.family));
  for (const e of [...entries.filter((e) => !families.has(e.family)), ...entries]) {
    if (out.length >= 3) break;
    if (used.has(e.key)) continue;
    add(await editorialDoor(e, ctx, "entry", () => e.description, e.kicker).catch(() => null));
    families.add(e.family);
  }

  if (out.length) store.set(DOORS_KEY, { key, doors: out } satisfies DoorsCache);
  return out;
}

/* ---------- Ce soir : une envie, un film ---------- */

export type Envie = "court" | "possede" | "watchlist" | "classique";
export type Idea = { id: number; why: string };

const SHORT = 100;

/** Les films qui répondent à une envie, dans un ordre tiré pour la journée. */
export async function tonight(envie: Envie, ctx: Ctx): Promise<Idea[]> {
  const r = seeded(`${localDay()}|${ctx.userId}|${envie}`);
  const unseenOwned = [...ctx.owned.keys()].filter((id) => !ctx.seen.has(id));

  if (envie === "possede") return shuffle(unseenOwned, r).map((id) => ({ id, why: `Dans ta collection en ${formatLabel(ctx.owned.get(id)![0])}, pas encore vu.` }));

  if (envie === "watchlist") {
    const dates = await watchlistDates(ctx.sb);
    return shuffle([...dates.entries()], r).map(([id, at]) => ({ id, why: `Dans ta watchlist depuis ${ago(at)}.` }));
  }

  if (envie === "court") {
    const wl = await loadWatchlistFilms(ctx.sb).catch(() => [] as Movie[]);
    const need = [...wl.filter((m) => m.runtime == null).slice(0, 24).map((m) => m.id), ...unseenOwned.slice(0, 16)];
    const rt = new Map(wl.filter((m) => m.runtime).map((m) => [m.id, m.runtime!]));
    await mapLimit(need, 4, async (id) => {
      const d = await tmdb<Movie>(`movie/${id}`).catch(() => null);
      if (d?.runtime) rt.set(id, d.runtime);
    });
    const short = (id: number) => (rt.get(id) ?? 999) <= SHORT && (rt.get(id) ?? 0) >= 60;
    const mine: Idea[] = [
      ...wl.filter((m) => !ctx.seen.has(m.id) && short(m.id)).map((m) => ({ id: m.id, why: `${runtime(rt.get(m.id))} · dans ta watchlist.` })),
      ...unseenOwned.filter(short).map((id) => ({ id, why: `${runtime(rt.get(id))} · dans ta collection, pas encore vu.` })),
    ];
    const ideas = shuffle(mine, r);
    if (ideas.length < 3) {
      const res = await tmdb<Paged<Movie>>("discover/movie", { "with_runtime.lte": SHORT, "with_runtime.gte": 70, "vote_count.gte": 1500, "vote_average.gte": 7.3, sort_by: "vote_average.desc", without_genres: "99,10770,16" }).catch(() => null);
      for (const m of shuffle(res?.results ?? [], r)) if (!ctx.seen.has(m.id) && !ideas.some((i) => i.id === m.id)) ideas.push({ id: m.id, why: "Moins de 1 h 40, et parmi les films les plus admirés." });
    }
    return ideas;
  }

  // un classique : les films d'avant 1980 les plus admirés, et les coups de cœur de la même époque
  const pages = await Promise.all(
    [1, 2].map((page) =>
      tmdb<Paged<Movie>>("discover/movie", { "primary_release_date.lte": "1979-12-31", "vote_count.gte": 1500, sort_by: "vote_average.desc", without_genres: "99,10770", page }).catch(() => null),
    ),
  );
  const list = pages.flatMap((p) => p?.results ?? []).filter((m) => !ctx.seen.has(m.id));
  return shuffle([...new Map(list.map((m) => [m.id, m])).values()], r).map((m) => ({ id: m.id, why: "Un des films d'avant 1980 les plus admirés, et tu ne l'as pas encore vu." }));
}

/* ---------- Sur une fiche film : où aller ensuite ---------- */

/** Le cinéaste, la saga, les sélections dont le film fait partie : autant de chemins vers un autre film. */
export async function filmDoors(
  film: { id: number; directors: { id: number; name: string }[]; saga: { id: number; name: string } | null },
  seen: Set<number>,
  signedIn: boolean,
): Promise<Door[]> {
  const out: Door[] = [];
  const dir = film.directors[0];
  if (dir) {
    const films = await directed(dir.id).catch(() => []);
    const next = nextIn(films, seen, film.id);
    if (films.length >= 2 && next) {
      const k = films.filter((m) => seen.has(m.id)).length;
      out.push({
        key: `director-${dir.id}`,
        kind: "director",
        kicker: "Du même cinéaste",
        title: dir.name,
        why: signedIn && k ? `Tu as vu ${k} de ses ${films.length} films.` : `${films.length} films réalisés.`,
        href: `/ensembles/${personKey(dir.id, "director")}`,
        next: doorNext(next),
        nextLabel: signedIn && k ? "Et ensuite" : "Par où commencer",
        still: stillOf(films, next),
      });
    }
  }
  if (film.saga) {
    const c = await tmdb<{ name: string; parts: Movie[] }>(`collection/${film.saga.id}`).catch(() => null);
    const parts = (c?.parts ?? []).filter((m) => !upcoming(m)).sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
    // dans une saga, on continue dans l'ordre
    const next = parts.find((m) => m.id !== film.id && !seen.has(m.id)) ?? null;
    if (parts.length >= 2 && next) {
      const k = parts.filter((m) => seen.has(m.id)).length;
      out.push({
        key: `saga-${film.saga.id}`,
        kind: "saga",
        kicker: "La saga",
        title: film.saga.name.replace(/\s*[-–]\s*(saga|collection)$/i, ""),
        why: signedIn ? `${k} vu${k > 1 ? "s" : ""} sur ${parts.length}.` : plural(parts.length, "film"),
        href: `/ensembles/saga-${film.saga.id}`,
        next: doorNext(next),
        nextLabel: "Dans l'ordre",
        still: stillOf(parts, next),
      });
    }
  }
  // sélections éditoriales déjà retrouvées sur ce navigateur
  for (const e of EDITORIAL) {
    if (out.length >= 3) break;
    const films = cachedEditorial(e.key);
    if (!films?.some((m) => m.id === film.id) || out.some((d) => d.key === e.key)) continue;
    const next = nextIn(films, seen, film.id);
    if (!next) continue;
    const k = films.filter((m) => seen.has(m.id)).length;
    out.push({
      key: e.key,
      kind: "entry",
      kicker: `Fait partie de · ${e.kicker}`,
      title: e.title,
      why: signedIn && k ? `Tu en as vu ${k} sur ${films.length}.` : `${plural(films.length, "film")}${signedIn ? ", aucun vu pour l'instant" : ""}.`,
      href: `/ensembles/${e.key}`,
      next: doorNext(next),
      nextLabel: "Et ensuite",
      still: stillOf(films, next),
    });
  }
  return out.slice(0, 3);
}
