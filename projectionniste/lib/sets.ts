// Ensembles de films : filmographies, sagas, studios, sélections éditoriales.
// Un ensemble se suit comme RAYON (le posséder, dans la Collection) ou comme CYCLE (le voir, dans le Journal).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFilms, filmRow } from "./db";
import { EDITORIAL, type EditorialDef } from "./editorial";
import { store } from "./store";
import { check } from "./supabase";
import { mapLimit, tmdb } from "./tmdb";
import type { Movie, Paged, PersonCredit, PersonCredits } from "./types";

export type Mode = "own" | "watch";
export type Role = "director" | "main" | "all";
export type Source = "person" | "tmdb_collection" | "tmdb_company" | "editorial" | "list";

export type SetDef = {
  key: string;
  source: Source;
  sourceRef: string | null;
  rules: Record<string, unknown>;
  title: string;
  /** libellé au-dessus du titre : « Réalisateur », « Saga », « Palmarès »… */
  kicker: string;
  description: string | null;
  /** la règle en clair, affichée sur la page de l'ensemble */
  rule: string;
  cover: string | null;
};

export type SetFilm = Movie & { caption?: string };

export const ROLE_LABEL: Record<Role, string> = { director: "Ses films en tant que réalisateur", main: "Ses rôles principaux", all: "Toute sa filmographie" };

export const personKey = (id: number, role: Role) => `personne-${id}-${role}`;
export const sagaKey = (id: number) => `saga-${id}`;
export const studioKey = (id: number) => `studio-${id}`;

const today = () => new Date().toISOString().slice(0, 10);
/** Film pas encore sorti : il fait partie de l'ensemble mais ne compte pas encore. */
export const upcoming = (m: Pick<Movie, "release_date">) => !m.release_date || m.release_date > today();

/** Apparitions, archives, « lui-même » : pas vraiment un rôle. */
const CAMEO = /uncredited|non crédité|himself|herself|lui-même|elle-même|\bself\b|archive|voice \(uncredited\)/i;
const DOC = 99;
const TV = 10770;

/** Les films d'une personne selon le rôle choisi, sans apparitions, téléfilms, documentaires ni films introuvables. */
export function personFilms(c: PersonCredits, role: Role): PersonCredit[] {
  const directed = c.crew.filter((m) => m.job === "Director");
  const acted = c.cast.filter((m) => !CAMEO.test(m.character || "") && (role !== "main" || (m.order ?? 99) < 8));
  const pool = role === "director" ? directed : role === "main" ? acted : [...acted, ...directed];
  return pool.filter((m) => !(m.genre_ids ?? []).includes(DOC) && !(m.genre_ids ?? []).includes(TV) && (m.poster_path || (m.vote_count ?? 0) >= 5));
}

const byDate = (a: Movie, b: Movie) => (a.release_date || "9999").localeCompare(b.release_date || "9999");
const uniq = <T extends { id: number }>(l: T[]) => [...new Map(l.map((m) => [m.id, m])).values()];

/** La définition d'un ensemble à partir de sa clé (une requête TMDB au plus, pour le nom). */
export async function resolveDef(key: string): Promise<SetDef | null> {
  const ed: EditorialDef | undefined = EDITORIAL.find((e) => e.key === key);
  if (ed) {
    return {
      key,
      source: ed.company ? "tmdb_company" : ed.saga ? "tmdb_collection" : "editorial",
      sourceRef: ed.company ? String(ed.company) : ed.saga ? String(ed.saga) : key,
      rules: {},
      title: ed.title,
      kicker: ed.kicker,
      description: ed.description,
      rule: ed.rule,
      cover: null,
    };
  }
  let m = key.match(/^personne-(\d+)-(director|main|all)$/);
  if (m) {
    const role = m[2] as Role;
    const p = await tmdb<{ id: number; name: string; profile_path?: string | null }>(`person/${m[1]}`);
    return {
      key,
      source: "person",
      sourceRef: m[1],
      rules: { role },
      title: p.name,
      kicker: role === "director" ? "Réalisation" : role === "main" ? "Rôles principaux" : "Filmographie",
      description: null,
      rule:
        (role === "director" ? "Les longs métrages qu'il ou elle a réalisés" : role === "main" ? "Ses rôles parmi les huit premiers noms du générique" : "Tous ses rôles et ses réalisations") +
        ", sans les apparitions, les téléfilms, les documentaires ni les films introuvables. Les films pas encore sortis s'ajoutent à leur sortie.",
      cover: p.profile_path ?? null,
    };
  }
  m = key.match(/^saga-(\d+)$/);
  if (m) {
    const c = await tmdb<{ name: string; overview?: string; backdrop_path?: string | null }>(`collection/${m[1]}`);
    return { key, source: "tmdb_collection", sourceRef: m[1], rules: {}, title: c.name.replace(/\s*[-–]\s*(saga|collection)$/i, ""), kicker: "Saga", description: c.overview || null, rule: "Tous les films de la saga, dans l'ordre de sortie.", cover: c.backdrop_path ?? null };
  }
  m = key.match(/^studio-(\d+)$/);
  if (m) {
    const c = await tmdb<{ name: string; description?: string }>(`company/${m[1]}`);
    return { key, source: "tmdb_company", sourceRef: m[1], rules: {}, title: c.name, kicker: "Studio", description: c.description || null, rule: "Les longs métrages produits par le studio (au moins 20 votes sur TMDB), sortis ou annoncés.", cover: null };
  }
  return null;
}

/** Les films d'un ensemble, lus à la source (TMDB ou sélection éditoriale), par date de sortie. */
export async function resolveFilms(def: SetDef, signal?: AbortSignal): Promise<SetFilm[]> {
  const opts = { signal };
  const ed = EDITORIAL.find((e) => e.key === def.key);
  if (def.source === "person") {
    const c = await tmdb<PersonCredits>(`person/${def.sourceRef}/movie_credits`, {}, opts);
    return uniq(personFilms(c, def.rules.role as Role)).sort(byDate);
  }
  if (def.source === "tmdb_collection" && !ed?.films) {
    const c = await tmdb<{ parts: Movie[] }>(`collection/${def.sourceRef}`, {}, opts);
    return uniq(c.parts ?? []).sort(byDate);
  }
  if (def.source === "tmdb_company" && !ed?.films) {
    const first = await tmdb<Paged<Movie>>("discover/movie", { with_companies: def.sourceRef, sort_by: "primary_release_date.asc", "vote_count.gte": 20, page: 1 }, opts);
    const more = await mapLimit(Array.from({ length: Math.min(first.total_pages, 5) - 1 }, (_, i) => i + 2), 2, (page) =>
      tmdb<Paged<Movie>>("discover/movie", { with_companies: def.sourceRef, sort_by: "primary_release_date.asc", "vote_count.gte": 20, page }, opts).then((p) => p.results, () => [] as Movie[]),
    );
    return uniq([...first.results, ...more.flat()].filter((m) => !(m.genre_ids ?? []).includes(TV))).sort(byDate);
  }
  if (!ed?.films) return [];
  const cached = cachedEditorial(ed.key);
  if (cached) return cached;
  // sélection éditoriale : chaque titre est retrouvé sur TMDB (titre + année), une fois
  let failed = 0;
  const found = await mapLimit(ed.films, 4, async ([q, year, caption]) => {
    const r = await tmdb<Paged<Movie>>("search/movie", { query: q, year }, opts).catch(() => (failed++, null));
    const hit = r?.results?.find((m) => (m.release_date || "").startsWith(String(year))) ?? r?.results?.[0];
    return hit ? ({ ...hit, caption } as SetFilm) : null;
  });
  const films = uniq(found.filter((m): m is SetFilm => !!m));
  // gardé un mois dans le navigateur (seulement si TMDB a répondu à tout)
  if (!failed && films.length) store.set(ED_PREFIX + ed.key, { sig: edSig(ed), at: Date.now(), films: films.map(slimSetFilm) } satisfies EdCache);
  return films;
}

/* ---------- sélections éditoriales résolues, gardées dans le navigateur ---------- */

const ED_PREFIX = "projo.ed.v1.";
const ED_TTL = 30 * 86400000;
type EdCache = { sig: string; at: number; films: SetFilm[] };
const edSig = (ed: EditorialDef) => String([...JSON.stringify(ed.films ?? [])].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7));
const slimSetFilm = ({ id, title, original_title, release_date, poster_path, backdrop_path, vote_average, vote_count, genre_ids, caption }: SetFilm): SetFilm => ({
  id, title, original_title, release_date, poster_path, backdrop_path, vote_average, vote_count, genre_ids, caption,
});

/** Les films d'une sélection éditoriale s'ils ont déjà été retrouvés sur TMDB (sans requête). */
export function cachedEditorial(key: string): SetFilm[] | null {
  const ed = EDITORIAL.find((e) => e.key === key);
  if (!ed?.films) return null;
  const c = store.get<EdCache | null>(ED_PREFIX + key, null);
  return c && c.sig === edSig(ed) && Date.now() - c.at < ED_TTL ? c.films : null;
}

/* ---------- ce que l'utilisateur suit (copie personnelle de l'ensemble) ---------- */

export type MySet = {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  cover_path: string | null;
  synced_at: string | null;
  follows: { mode: Mode; started_at: string; archived_at: string | null; completed_at: string | null; completed_count: number | null }[];
  exclusions: { tmdb_id: number }[];
};

const MY = "id, key, title, subtitle, cover_path, synced_at, follows:set_follows(mode, started_at, archived_at, completed_at, completed_count), exclusions:set_exclusions(tmdb_id)";

export async function mySets(sb: SupabaseClient): Promise<MySet[]> {
  return check(await sb.from("film_sets").select(MY).order("created_at")) as unknown as MySet[];
}

export async function mySet(sb: SupabaseClient, key: string): Promise<MySet | null> {
  return check(await sb.from("film_sets").select(MY).eq("key", key).maybeSingle()) as unknown as MySet | null;
}

export type Progress = { set_id: string; mode: Mode; total: number; done: number };

export async function setProgress(sb: SupabaseClient): Promise<Progress[]> {
  return check(await sb.rpc("set_progress")) as Progress[];
}

/** Copie (ou met à jour) l'ensemble et ses films dans la base de l'utilisateur. */
export async function syncSet(sb: SupabaseClient, def: SetDef, films: SetFilm[]): Promise<string> {
  const row = check(
    await sb
      .from("film_sets")
      .upsert(
        { key: def.key, source: def.source, source_ref: def.sourceRef, rules: def.rules, title: def.title, subtitle: def.kicker, cover_path: def.cover, synced_at: new Date().toISOString() },
        { onConflict: "owner_id,key" },
      )
      .select("id")
      .single(),
  ) as { id: string };
  await ensureFilms(sb, films.map((m) => filmRow(m)));
  const now = new Date().toISOString();
  if (films.length)
    check(
      await sb.from("film_set_items").upsert(
        films.map((m, i) => ({ set_id: row.id, tmdb_id: m.id, position: i, caption: m.caption ?? null, release_date: m.release_date || null, removed_at: null })),
        { onConflict: "set_id,tmdb_id" },
      ),
    );
  // ce qui a disparu de la source ne compte plus, sans être effacé
  const ids = films.map((m) => m.id);
  const q = sb.from("film_set_items").update({ removed_at: now }).eq("set_id", row.id).is("removed_at", null);
  check(await (ids.length ? q.not("tmdb_id", "in", `(${ids.join(",")})`) : q));
  return row.id;
}

export async function follow(sb: SupabaseClient, def: SetDef, films: SetFilm[], mode: Mode): Promise<string> {
  const id = await syncSet(sb, def, films);
  check(await sb.from("set_follows").upsert({ set_id: id, mode, archived_at: null }, { onConflict: "set_id,mode" }));
  return id;
}

export async function unfollow(sb: SupabaseClient, setId: string, mode: Mode) {
  check(await sb.from("set_follows").delete().eq("set_id", setId).eq("mode", mode));
  // plus suivi du tout : la copie n'a plus de raison d'être
  const left = check(await sb.from("set_follows").select("mode").eq("set_id", setId)) as unknown[];
  if (!left.length) check(await sb.from("film_sets").delete().eq("id", setId));
}

export async function setExcluded(sb: SupabaseClient, setId: string, tmdbId: number, on: boolean) {
  if (on) check(await sb.from("set_exclusions").upsert({ set_id: setId, tmdb_id: tmdbId }, { onConflict: "set_id,tmdb_id" }));
  else check(await sb.from("set_exclusions").delete().eq("set_id", setId).eq("tmdb_id", tmdbId));
}

/** Note la complétion (une seule fois) : un nouveau film ensuite n'efface pas la date. */
export async function markCompleted(sb: SupabaseClient, setId: string, mode: Mode, count: number) {
  check(await sb.from("set_follows").update({ completed_at: new Date().toISOString(), completed_count: count }).eq("set_id", setId).eq("mode", mode).is("completed_at", null));
}

/** Compte, dans une liste de films, ceux qui sont sortis et pas exclus. */
export function countable(films: SetFilm[], excluded: Set<number>) {
  return films.filter((m) => !upcoming(m) && !excluded.has(m.id));
}

/** Les films des ensembles suivis, pour « Fait partie de » sur une fiche film. */
export async function setsWithFilm(sb: SupabaseClient, tmdbId: number): Promise<{ key: string; title: string; subtitle: string | null }[]> {
  const rows = check(await sb.from("film_set_items").select("film_sets(key, title, subtitle)").eq("tmdb_id", tmdbId).is("removed_at", null)) as unknown as {
    film_sets: { key: string; title: string; subtitle: string | null } | null;
  }[];
  return rows.map((r) => r.film_sets).filter((s): s is NonNullable<typeof s> => !!s);
}

export type SetItem = { set_id: string; tmdb_id: number; position: number; caption: string | null; release_date: string | null; films: { title: string; poster_path: string | null; release_date: string | null } | null };

/** Les films (encore dans la source) de plusieurs ensembles suivis, dans leur ordre. */
export async function setItems(sb: SupabaseClient, setIds: string[]): Promise<SetItem[]> {
  if (!setIds.length) return [];
  const out: SetItem[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(
      await sb
        .from("film_set_items")
        .select("set_id, tmdb_id, position, caption, release_date, films(title, poster_path, release_date)")
        .in("set_id", setIds)
        .is("removed_at", null)
        .order("position")
        .range(from, from + 999),
    ) as unknown as SetItem[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** Suivis dans un mode, avec leurs films comptés (sortis, non exclus). */
export function followedIn(sets: MySet[], items: SetItem[], mode: Mode) {
  return sets
    .map((s) => {
      const f = s.follows.find((x) => x.mode === mode);
      if (!f || f.archived_at) return null;
      const ex = new Set(s.exclusions.map((x) => x.tmdb_id));
      const films = items.filter((i) => i.set_id === s.id && !ex.has(i.tmdb_id) && !upcoming({ release_date: i.release_date ?? undefined }));
      return { set: s, follow: f, films };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.follow.started_at.localeCompare(a.follow.started_at));
}

/** Les parcours suivis (comme rayon, comme cycle, ou les deux), avec leurs films comptés : sortis et non exclus. */
export function followedAll(sets: MySet[], items: SetItem[]) {
  return sets
    .map((s) => {
      const fs = s.follows.filter((f) => !f.archived_at);
      if (!fs.length) return null;
      const ex = new Set(s.exclusions.map((x) => x.tmdb_id));
      const films = items.filter((i) => i.set_id === s.id && !ex.has(i.tmdb_id) && !upcoming({ release_date: i.release_date ?? undefined }));
      return { set: s, follows: fs, films };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.follows[0].started_at.localeCompare(a.follows[0].started_at));
}

export type Parcours = ReturnType<typeof followedAll>[number];

/** Suit un parcours en entier : à voir (cycle) et à posséder (rayon). */
export async function followBoth(sb: SupabaseClient, def: SetDef, films: SetFilm[], have: Mode[]) {
  for (const mode of ["watch", "own"] as Mode[]) if (!have.includes(mode)) await follow(sb, def, films, mode);
}

export async function unfollowAll(sb: SupabaseClient, setId: string, have: Mode[]) {
  for (const mode of have) await unfollow(sb, setId, mode);
}

/** Où tu en es : vus, possédés, le prochain film à voir et le disque à chercher. */
export function parcoursState(films: { tmdb_id: number; release_date?: string | null; films: { title: string; release_date: string | null } | null }[], seen: Set<number>, owned: { has(id: number): boolean }) {
  const label = (f: (typeof films)[number]) => ({ id: f.tmdb_id, title: f.films?.title ?? "Film", year: (f.release_date || f.films?.release_date || "").slice(0, 4) });
  const seenN = films.filter((f) => seen.has(f.tmdb_id)).length;
  const ownedN = films.filter((f) => owned.has(f.tmdb_id)).length;
  const bothN = films.filter((f) => seen.has(f.tmdb_id) && owned.has(f.tmdb_id)).length;
  const toSee = films.find((f) => !seen.has(f.tmdb_id));
  // le disque à chercher : d'abord un film que tu connais déjà et n'as pas
  const toOwn = films.find((f) => seen.has(f.tmdb_id) && !owned.has(f.tmdb_id)) ?? films.find((f) => !owned.has(f.tmdb_id));
  return { total: films.length, seenN, ownedN, bothN, toSee: toSee ? label(toSee) : null, toOwn: toOwn ? { ...label(toOwn), known: seen.has(toOwn.tmdb_id) } : null };
}

/** Après un film vu ou un disque ajouté : où en est le parcours suivi qui le contient (le plus avancé), et la suite. */
export async function parcoursAfter(sb: SupabaseClient, tmdbId: number, seen: Set<number>, owned: { has(id: number): boolean }) {
  const rows = check(await sb.from("film_set_items").select("set_id").eq("tmdb_id", tmdbId).is("removed_at", null)) as { set_id: string }[];
  if (!rows.length) return null;
  const ids = new Set(rows.map((r) => r.set_id));
  const sets = (await mySets(sb)).filter((x) => ids.has(x.id) && x.follows.some((f) => !f.archived_at));
  if (!sets.length) return null;
  const items = await setItems(sb, sets.map((x) => x.id));
  let best: { key: string; title: string; st: ReturnType<typeof parcoursState>; score: number } | null = null;
  for (const r of followedAll(sets, items)) {
    if (!r.films.some((f) => f.tmdb_id === tmdbId)) continue;
    const st = parcoursState(r.films, seen, owned);
    const score = st.seenN + st.ownedN;
    if (!best || score > best.score) best = { key: r.set.key, title: r.set.title, st, score };
  }
  return best;
}
