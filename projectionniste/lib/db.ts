// Accès aux données de l'utilisateur dans Supabase.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { check, chunks } from "./supabase";
import type { FilmRow, FilmState, Movie, Profile, Settings, Taste } from "./types";

export const EMPTY_STATE: FilmState = { watched: false, watchlist: false, favorite: false, hidden: false, rating: null };

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
  settings: Settings | null;
  taste: (Taste & { importedAt?: string }) | null;
  updated_at: string;
};

export async function loadProfile(sb: SupabaseClient, userId: string): Promise<Profile> {
  // réglages et goûts ne sont lisibles que par leur propriétaire (fonction my_profile)
  const res = await sb.rpc("my_profile");
  let row: ProfileRow | null;
  if (res.error?.code === "PGRST202")
    // migration 20260929140000 pas encore appliquée
    row = check(await sb.from("profiles").select("id, username, display_name, settings, taste, updated_at").eq("id", userId).maybeSingle()) as ProfileRow | null;
  else row = ((check(res) as ProfileRow[] | null) ?? [])[0] ?? null;
  if (!row) {
    // profil absent (utilisateur créé avant le trigger) : on le crée
    check(await sb.from("profiles").insert({ id: userId }));
    row = { id: userId, username: null, display_name: null, settings: {}, taste: null, updated_at: new Date().toISOString() };
  }
  const t = row.taste;
  return {
    id: row.id,
    owner: row.display_name || row.username || "",
    mu: t?.mu ?? 3.5,
    aff: t?.aff ?? { d: {}, c: {}, g: {} },
    learned: !!t,
    settings: row.settings ?? {},
    importedAt: t?.importedAt ?? null,
    updatedAt: row.updated_at,
  };
}

export async function updateProfile(sb: SupabaseClient, userId: string, patch: { settings?: Settings; taste?: Taste & { importedAt?: string }; display_name?: string | null }) {
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
        .select("tmdb_id, watched, watchlist, favorite, hidden, rating, films(title)")
        .order("tmdb_id")
        .range(from, from + 999),
    ) as unknown as UserFilmRow[];
    for (const r of rows) {
      states.set(r.tmdb_id, { watched: r.watched, watchlist: r.watchlist, favorite: r.favorite, hidden: r.hidden, rating: r.rating == null ? null : +r.rating });
      if (r.films?.title) titles[r.tmdb_id] = r.films.title;
    }
    if (rows.length < 1000) break;
  }
  return { states, titles };
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
