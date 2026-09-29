// Journal : une entrée par visionnage (table diary_entries).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFilms } from "./db";
import { check } from "./supabase";
import type { FilmRow } from "./types";

export type DiaryEntry = {
  id: string;
  tmdb_id: number;
  watched_on: string | null;
  rating: number | null;
  rewatch: boolean;
  liked: boolean;
  review: string | null;
  spoilers: boolean;
  review_public: boolean;
  tags: string[];
  created_at: string;
  films?: { title: string; release_date: string | null; poster_path: string | null } | null;
};

export type EntryInput = Pick<DiaryEntry, "watched_on" | "rating" | "rewatch" | "liked" | "review" | "spoilers" | "review_public" | "tags">;

const COLS = "id, tmdb_id, watched_on, rating, rewatch, liked, review, spoilers, review_public, tags, created_at, films(title, release_date, poster_path)";

const norm = (e: DiaryEntry): DiaryEntry => ({ ...e, rating: e.rating == null ? null : +e.rating });

export type DiaryFilter = { year?: number; tag?: string; reviews?: boolean; rewatch?: boolean; minRating?: number };

// Les critiques publiques des autres sont lisibles aussi : on filtre toujours sur l'utilisateur.
export async function listEntries(sb: SupabaseClient, userId: string, f: DiaryFilter, from: number, size: number): Promise<DiaryEntry[]> {
  let q = sb.from("diary_entries").select(COLS).eq("user_id", userId);
  if (f.year) q = q.gte("watched_on", `${f.year}-01-01`).lte("watched_on", `${f.year}-12-31`);
  if (f.tag) q = q.contains("tags", [f.tag]);
  if (f.reviews) q = q.not("review", "is", null);
  if (f.rewatch) q = q.eq("rewatch", true);
  if (f.minRating) q = q.gte("rating", f.minRating);
  const rows = check(
    await q
      .order("watched_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, from + size - 1),
  ) as unknown as DiaryEntry[];
  return rows.map(norm);
}

export async function entriesForFilm(sb: SupabaseClient, userId: string, tmdbId: number): Promise<DiaryEntry[]> {
  const rows = check(
    await sb.from("diary_entries").select(COLS).eq("user_id", userId).eq("tmdb_id", tmdbId).order("watched_on", { ascending: false, nullsFirst: false }),
  ) as unknown as DiaryEntry[];
  return rows.map(norm);
}

/** Années et étiquettes présentes dans le journal (pour les filtres). */
export async function diaryIndex(sb: SupabaseClient, userId: string) {
  const years = new Map<number, number>();
  const tags = new Map<string, number>();
  let total = 0;
  for (let from = 0; ; from += 1000) {
    const rows = check(await sb.from("diary_entries").select("watched_on, tags").eq("user_id", userId).order("id").range(from, from + 999)) as { watched_on: string | null; tags: string[] }[];
    for (const r of rows) {
      total++;
      if (r.watched_on) {
        const y = +r.watched_on.slice(0, 4);
        years.set(y, (years.get(y) || 0) + 1);
      }
      for (const t of r.tags) tags.set(t, (tags.get(t) || 0) + 1);
    }
    if (rows.length < 1000) break;
  }
  return {
    total,
    years: [...years.entries()].sort((a, b) => b[0] - a[0]),
    tags: [...tags.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")),
  };
}

export async function saveEntry(sb: SupabaseClient, userId: string, film: FilmRow, input: EntryInput, id?: string): Promise<DiaryEntry> {
  await ensureFilms(sb, [film]);
  const row = { ...input, review: input.review?.trim() || null, tags: [...new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))] };
  const res = id
    ? await sb.from("diary_entries").update(row).eq("id", id).select(COLS).single()
    : await sb.from("diary_entries").insert({ ...row, user_id: userId, tmdb_id: film.tmdb_id }).select(COLS).single();
  return norm(check(res) as unknown as DiaryEntry);
}

export async function deleteEntry(sb: SupabaseClient, id: string) {
  check(await sb.from("diary_entries").delete().eq("id", id));
}

/* ---------- top 5 ---------- */

export type TopFilm = { slot: number; tmdb_id: number; films: { title: string; release_date: string | null; poster_path: string | null } | null };

export async function loadTop(sb: SupabaseClient, userId: string): Promise<TopFilm[]> {
  return check(
    await sb.from("top_films").select("slot, tmdb_id, films(title, release_date, poster_path)").eq("user_id", userId).order("slot"),
  ) as unknown as TopFilm[];
}

export async function setTopSlot(sb: SupabaseClient, userId: string, film: FilmRow, slot: number) {
  await ensureFilms(sb, [film]);
  // un film n'apparaît qu'une fois dans le top
  check(await sb.from("top_films").delete().eq("user_id", userId).eq("tmdb_id", film.tmdb_id));
  check(await sb.from("top_films").upsert({ user_id: userId, slot, tmdb_id: film.tmdb_id }, { onConflict: "user_id,slot" }));
}

export async function clearTopSlot(sb: SupabaseClient, userId: string, slot: number) {
  check(await sb.from("top_films").delete().eq("user_id", userId).eq("slot", slot));
}
