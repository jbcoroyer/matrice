// Collection : exemplaires possédés (collection_items) et partage public (collection_shares).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFilms } from "./db";
import { check } from "./supabase";
import type { FilmRow } from "./types";

export const FORMATS = [
  { k: "4k", l: "4K UHD" },
  { k: "bluray", l: "Blu-ray" },
  { k: "dvd", l: "DVD" },
  { k: "steelbook", l: "Steelbook" },
  { k: "collector", l: "Édition collector" },
  { k: "vhs", l: "VHS" },
  { k: "laserdisc", l: "LaserDisc" },
  { k: "numerique", l: "Numérique" },
] as const;
export type Format = (typeof FORMATS)[number]["k"];
export const formatLabel = (k: string) => FORMATS.find((f) => f.k === k)?.l ?? k;

export const CONDITIONS = [
  { k: "neuf", l: "Neuf / sous blister" },
  { k: "tres_bon", l: "Très bon état" },
  { k: "bon", l: "Bon état" },
  { k: "use", l: "Usé" },
] as const;
export const conditionLabel = (k: string | null) => CONDITIONS.find((c) => c.k === k)?.l ?? "";

export type FilmMeta = { title: string; release_date: string | null; poster_path: string | null; genre_ids: number[] };

export type CollectionItem = {
  id: string;
  tmdb_id: number;
  format: Format;
  edition: string | null;
  condition: string | null;
  notes: string | null;
  acquired_on: string | null;
  created_at: string;
  films: FilmMeta | null;
};

export type ItemInput = Pick<CollectionItem, "format" | "edition" | "condition" | "notes" | "acquired_on">;

const COLS = "id, tmdb_id, format, edition, condition, notes, acquired_on, created_at, films(title, release_date, poster_path, genre_ids)";

export async function listCollection(sb: SupabaseClient): Promise<CollectionItem[]> {
  const out: CollectionItem[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(await sb.from("collection_items").select(COLS).order("created_at", { ascending: false }).range(from, from + 999)) as unknown as CollectionItem[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export async function itemsForFilm(sb: SupabaseClient, tmdbId: number): Promise<CollectionItem[]> {
  return check(await sb.from("collection_items").select(COLS).eq("tmdb_id", tmdbId).order("created_at")) as unknown as CollectionItem[];
}

export async function saveItem(sb: SupabaseClient, userId: string, film: FilmRow, input: ItemInput, id?: string) {
  await ensureFilms(sb, [film]);
  const row = {
    format: input.format,
    edition: input.edition?.trim() || null,
    condition: input.condition || null,
    notes: input.notes?.trim() || null,
    acquired_on: input.acquired_on || null,
  };
  check(id ? await sb.from("collection_items").update(row).eq("id", id) : await sb.from("collection_items").insert({ ...row, user_id: userId, tmdb_id: film.tmdb_id }));
}

export async function deleteItem(sb: SupabaseClient, id: string) {
  check(await sb.from("collection_items").delete().eq("id", id));
}

/** Films vus, avec les infos d'affichage (pour l'onglet « Vus » de la collection). */
export async function listWatched(sb: SupabaseClient): Promise<{ tmdb_id: number; rating: number | null; favorite: boolean; films: FilmMeta | null }[]> {
  const out: { tmdb_id: number; rating: number | null; favorite: boolean; films: FilmMeta | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(
      await sb
        .from("user_films")
        .select("tmdb_id, rating, favorite, films(title, release_date, poster_path, genre_ids)")
        .eq("watched", true)
        .order("tmdb_id")
        .range(from, from + 999),
    ) as unknown as { tmdb_id: number; rating: number | null; favorite: boolean; films: FilmMeta | null }[];
    out.push(...rows.map((r) => ({ ...r, rating: r.rating == null ? null : +r.rating })));
    if (rows.length < 1000) break;
  }
  return out;
}

/* ---------- partage public ---------- */

export type Share = {
  share_code: string;
  enabled: boolean;
  title: string | null;
  description: string | null;
  show_notes: boolean;
  show_condition: boolean;
  view_count: number;
};

export async function getShare(sb: SupabaseClient, userId: string): Promise<Share | null> {
  return check(
    await sb.from("collection_shares").select("share_code, enabled, title, description, show_notes, show_condition, view_count").eq("user_id", userId).maybeSingle(),
  ) as Share | null;
}

export async function saveShare(sb: SupabaseClient, userId: string, patch: Partial<Omit<Share, "share_code" | "view_count">>): Promise<Share> {
  return check(
    await sb
      .from("collection_shares")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
      .select("share_code, enabled, title, description, show_notes, show_condition, view_count")
      .single(),
  ) as Share;
}

export type PublicItem = {
  title: string | null;
  description: string | null;
  owner_name: string | null;
  tmdb_id: number;
  film_title: string;
  release_date: string | null;
  poster_path: string | null;
  format: string;
  edition: string | null;
  condition: string | null;
  notes: string | null;
};

export async function getPublicCollection(sb: SupabaseClient, code: string): Promise<PublicItem[]> {
  const rows = check(await sb.rpc("get_public_collection", { code })) as PublicItem[];
  sb.rpc("count_collection_view", { code }).then(() => {});
  return rows;
}
