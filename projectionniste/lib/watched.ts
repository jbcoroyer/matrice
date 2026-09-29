// Films vus (pour l'onglet « Films vus » du journal).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FilmMeta } from "./collection";
import { check } from "./supabase";

export type WatchedFilm = { tmdb_id: number; rating: number | null; favorite: boolean; films: FilmMeta | null };

export async function listWatched(sb: SupabaseClient): Promise<WatchedFilm[]> {
  const out: WatchedFilm[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(
      await sb
        .from("user_films")
        .select("tmdb_id, rating, favorite, films(title, release_date, poster_path, genre_ids)")
        .eq("watched", true)
        .order("tmdb_id")
        .range(from, from + 999),
    ) as unknown as WatchedFilm[];
    out.push(...rows.map((r) => ({ ...r, rating: r.rating == null ? null : +r.rating })));
    if (rows.length < 1000) break;
  }
  return out;
}
