// Accès aux données de l'utilisateur dans Supabase.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { check, chunks } from "./supabase";
import type { FilmRow, FilmState, Movie, Profile, Settings, Taste } from "./types";

export const EMPTY_STATE: FilmState = { watched: false, watchlist: false, favorite: false, rating: null };

export type Account = { id: string; email: string | null; pendingEmail: string | null; anonymous: boolean };

export function accountOf(u: User): Account {
  return { id: u.id, email: u.email || null, pendingEmail: u.new_email || null, anonymous: !!u.is_anonymous && !u.email };
}

/** Utilisateur connecté, ou null (l'appli demande alors de se connecter). */
export async function currentAccount(sb: SupabaseClient): Promise<Account | null> {
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  // relit l'utilisateur côté serveur (l'email a pu être confirmé entre-temps)
  const fresh = await sb.auth.getUser();
  if (fresh.error && !fresh.data.user) return null;
  return accountOf(fresh.data.user ?? data.session.user);
}

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio?: string | null;
  settings: Settings | null;
  taste: (Taste & { importedAt?: string }) | null;
  show_activity?: boolean;
  updated_at: string;
};

export async function loadProfile(sb: SupabaseClient, userId: string): Promise<Profile> {
  // réglages et goûts ne sont lisibles que par leur propriétaire (fonction my_profile)
  let row = ((check(await sb.rpc("my_profile")) as ProfileRow[] | null) ?? [])[0] ?? null;
  if (!row) {
    // profil absent (utilisateur créé avant le trigger) : on le crée
    check(await sb.from("profiles").insert({ id: userId }));
    row = { id: userId, username: null, display_name: null, settings: {}, taste: null, updated_at: new Date().toISOString() };
  }
  return {
    id: row.id,
    owner: row.display_name || row.username || "",
    username: row.username ?? null,
    bio: row.bio ?? null,
    settings: row.settings ?? {},
    showActivity: row.show_activity ?? true,
    updatedAt: row.updated_at,
  };
}

export async function updateProfile(sb: SupabaseClient, userId: string, patch: { settings?: Settings; taste?: Taste & { importedAt?: string }; display_name?: string | null; username?: string | null; bio?: string | null; show_activity?: boolean }) {
  check(await sb.from("profiles").update(patch).eq("id", userId));
}

type UserFilmRow = FilmState & { tmdb_id: number; films: { title: string } | null };

/** Tous les films marqués par l'utilisateur, avec leur titre (par pages de 1000). */
export async function loadFilmStates(sb: SupabaseClient) {
  const states = new Map<number, FilmState>();
  const titles: Record<number, string> = {};
  for (let from = 0; ; from += 1000) {
    const rows = check(
      await sb
        .from("user_films")
        .select("tmdb_id, watched, watchlist, favorite, rating, films(title)")
        .order("tmdb_id")
        .range(from, from + 999),
    ) as unknown as UserFilmRow[];
    for (const r of rows) {
      states.set(r.tmdb_id, { watched: r.watched, watchlist: r.watchlist, favorite: r.favorite, rating: r.rating == null ? null : +r.rating });
      if (r.films?.title) titles[r.tmdb_id] = r.films.title;
    }
    if (rows.length < 1000) break;
  }
  return { states, titles };
}

export type SeenFilm = { tmdb_id: number; rating: number | null; favorite: boolean; title: string; release_date: string | null; genre_ids: number[] };

/** Tous les films vus, avec de quoi calculer des statistiques (genres, époques, notes) sans passer par TMDB. */
export async function loadSeenFilms(sb: SupabaseClient): Promise<SeenFilm[]> {
  const out: SeenFilm[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(
      await sb.from("user_films").select("tmdb_id, rating, favorite, films(title, release_date, genre_ids)").eq("watched", true).order("tmdb_id").range(from, from + 999),
    ) as unknown as { tmdb_id: number; rating: number | string | null; favorite: boolean; films: { title: string; release_date: string | null; genre_ids: number[] } | null }[];
    for (const r of rows)
      out.push({ tmdb_id: r.tmdb_id, rating: r.rating == null ? null : +r.rating, favorite: r.favorite, title: r.films?.title ?? "", release_date: r.films?.release_date ?? null, genre_ids: r.films?.genre_ids ?? [] });
    if (rows.length < 1000) break;
  }
  return out;
}

/** La watchlist telle qu'elle est en base, du film ajouté le plus récemment au plus ancien. */
export async function loadWatchlistFilms(sb: SupabaseClient): Promise<Movie[]> {
  type Row = {
    tmdb_id: number;
    films: { title: string; original_title: string | null; release_date: string | null; poster_path: string | null; backdrop_path: string | null; genre_ids: number[]; runtime: number | null } | null;
  };
  const FILM = "films(title, original_title, release_date, poster_path, backdrop_path, genre_ids, runtime)";
  const out: Movie[] = [];
  let ordered = true; // false si la base n'a pas encore la colonne watchlisted_at (migration non passée)
  for (let from = 0; ; from += 1000) {
    let res = ordered
      ? await sb.from("user_films").select(`tmdb_id, ${FILM}`).eq("watchlist", true).order("watchlisted_at", { ascending: false, nullsFirst: false }).order("updated_at", { ascending: false }).order("tmdb_id").range(from, from + 999)
      : null;
    if (res?.error && (res.error.code === "42703" || /watchlisted_at/.test(res.error.message))) {
      ordered = false;
      res = null;
    }
    res ??= await sb.from("user_films").select(`tmdb_id, ${FILM}`).eq("watchlist", true).order("updated_at", { ascending: false }).order("tmdb_id").range(from, from + 999);
    const rows = check(res) as unknown as Row[];
    for (const r of rows) {
      const f = r.films;
      if (!f) continue;
      out.push({
        id: r.tmdb_id,
        title: f.title,
        original_title: f.original_title ?? undefined,
        release_date: f.release_date ?? undefined,
        poster_path: f.poster_path,
        backdrop_path: f.backdrop_path,
        genre_ids: f.genre_ids,
        runtime: f.runtime ?? undefined,
      });
    }
    if (rows.length < 1000) break;
  }
  return out;
}

/** Convertit un film TMDB en ligne de cache. */
export function filmRow(m: Partial<Movie> & { id: number; title: string }): FilmRow {
  return {
    tmdb_id: m.id,
    title: m.title,
    original_title: m.original_title || null,
    release_date: m.release_date || null,
    poster_path: m.poster_path || null,
    backdrop_path: m.backdrop_path || null,
    genre_ids: m.genre_ids ?? (m.genres || []).map((g) => g.id),
    runtime: m.runtime ?? null,
  };
}

const knownFilms = new Set<number>();

/** Ajoute les films au cache partagé s'ils n'y sont pas (sans écraser l'existant). */
export async function ensureFilms(sb: SupabaseClient, rows: FilmRow[]) {
  const fresh = rows.filter((r) => !knownFilms.has(r.tmdb_id));
  const uniq = [...new Map(fresh.map((r) => [r.tmdb_id, r])).values()];
  for (const part of chunks(uniq)) check(await sb.from("films").upsert(part, { onConflict: "tmdb_id", ignoreDuplicates: true }));
  for (const r of uniq) knownFilms.add(r.tmdb_id);
}

export function markKnown(ids: Iterable<number>) {
  for (const id of ids) knownFilms.add(id);
}

/** Enregistre (partiellement) l'état d'un film. */
export async function saveFilmState(sb: SupabaseClient, userId: string, film: FilmRow, patch: Partial<FilmState>) {
  await ensureFilms(sb, [film]);
  check(await sb.from("user_films").upsert({ user_id: userId, tmdb_id: film.tmdb_id, ...patch }, { onConflict: "user_id,tmdb_id" }));
}

/** Enregistre des états en masse (import). */
export async function saveFilmStates(sb: SupabaseClient, userId: string, rows: (Partial<FilmState> & { tmdb_id: number })[], onProgress?: (done: number) => void) {
  let done = 0;
  for (const part of chunks(rows)) {
    check(await sb.from("user_films").upsert(part.map((r) => ({ user_id: userId, ...r })), { onConflict: "user_id,tmdb_id" }));
    onProgress?.((done += part.length));
  }
}
