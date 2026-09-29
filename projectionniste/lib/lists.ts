// Listes : classées ou non, publiques ou privées (tables lists et list_items).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFilms } from "./db";
import { check } from "./supabase";
import type { FilmRow } from "./types";

export type ListMeta = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  ranked: boolean;
  is_public: boolean;
  letterboxd_url: string | null;
  updated_at: string;
};

export type ListSummary = ListMeta & { count: number; posters: (string | null)[] };

export type ListFilm = { title: string; release_date: string | null; poster_path: string | null; genre_ids: number[] };

export type ListItem = { tmdb_id: number; position: number; note: string | null; films: ListFilm | null };

export type ListInput = Pick<ListMeta, "title" | "description" | "ranked" | "is_public">;

const META = "id, user_id, title, description, ranked, is_public, letterboxd_url, updated_at";

type Raw = ListMeta & { n: { count: number }[]; preview: { position: number; films: { poster_path: string | null } | null }[] };

/** Mes listes, les plus récemment modifiées d'abord, avec le nombre de films et quelques affiches. */
export async function myLists(sb: SupabaseClient, userId: string): Promise<ListSummary[]> {
  const rows = check(
    await sb
      .from("lists")
      .select(`${META}, n:list_items(count), preview:list_items(position, films(poster_path))`)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .order("position", { referencedTable: "preview" })
      .limit(5, { referencedTable: "preview" }),
  ) as unknown as Raw[];
  return rows.map(({ n, preview, ...l }) => ({ ...l, count: n[0]?.count ?? 0, posters: preview.map((p) => p.films?.poster_path ?? null) }));
}

/** Une liste (la mienne, ou celle d'un autre si elle est publique), ses films et le nom de son auteur. */
export async function getList(sb: SupabaseClient, id: string): Promise<{ list: ListMeta; items: ListItem[]; owner: string | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const list = check(await sb.from("lists").select(META).eq("id", id).maybeSingle()) as ListMeta | null;
  if (!list) return null;
  const items: ListItem[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(
      await sb
        .from("list_items")
        .select("tmdb_id, position, note, films(title, release_date, poster_path, genre_ids)")
        .eq("list_id", id)
        .order("position")
        .order("added_at")
        .range(from, from + 999),
    ) as unknown as ListItem[];
    items.push(...rows);
    if (rows.length < 1000) break;
  }
  const p = check(await sb.from("profiles").select("display_name, username").eq("id", list.user_id).maybeSingle()) as {
    display_name: string | null;
    username: string | null;
  } | null;
  return { list, items, owner: p?.display_name || p?.username || null };
}

const clean = (i: Partial<ListInput>) => ({
  ...i,
  ...(i.title !== undefined ? { title: i.title.trim().slice(0, 120) } : {}),
  ...(i.description !== undefined ? { description: i.description?.trim() || null } : {}),
});

export async function createList(sb: SupabaseClient, userId: string, input: ListInput): Promise<ListMeta> {
  return check(await sb.from("lists").insert({ ...clean(input), user_id: userId }).select(META).single()) as ListMeta;
}

export async function updateList(sb: SupabaseClient, id: string, patch: Partial<ListInput>): Promise<ListMeta> {
  return check(await sb.from("lists").update(clean(patch)).eq("id", id).select(META).single()) as ListMeta;
}

export async function deleteList(sb: SupabaseClient, id: string) {
  check(await sb.from("lists").delete().eq("id", id));
}

/** Ajoute un film en fin de liste (ou à la position donnée, pour annuler un retrait). */
export async function addToList(sb: SupabaseClient, listId: string, film: FilmRow, at?: { position: number; note: string | null }): Promise<number> {
  await ensureFilms(sb, [film]);
  let position = at?.position;
  if (position == null) {
    const last = check(await sb.from("list_items").select("position").eq("list_id", listId).order("position", { ascending: false }).limit(1)) as {
      position: number;
    }[];
    position = (last[0]?.position ?? 0) + 1;
  }
  check(await sb.from("list_items").insert({ list_id: listId, tmdb_id: film.tmdb_id, position, note: at?.note ?? null }));
  return position;
}

export async function removeFromList(sb: SupabaseClient, listId: string, tmdbId: number) {
  check(await sb.from("list_items").delete().eq("list_id", listId).eq("tmdb_id", tmdbId));
}

/** Écrit les nouvelles positions des films déplacés. */
export async function writePositions(sb: SupabaseClient, listId: string, rows: { tmdb_id: number; position: number }[]) {
  if (!rows.length) return;
  check(await sb.from("list_items").upsert(rows.map((r) => ({ list_id: listId, ...r })), { onConflict: "list_id,tmdb_id" }));
}

export async function setItemNote(sb: SupabaseClient, listId: string, tmdbId: number, note: string) {
  check(await sb.from("list_items").update({ note: note.trim() || null }).eq("list_id", listId).eq("tmdb_id", tmdbId));
}

/** Identifiants de mes listes qui contiennent ce film. */
export async function listsWithFilm(sb: SupabaseClient, userId: string, tmdbId: number): Promise<Set<string>> {
  const rows = check(await sb.from("list_items").select("list_id, lists!inner(user_id)").eq("tmdb_id", tmdbId).eq("lists.user_id", userId)) as {
    list_id: string;
  }[];
  return new Set(rows.map((r) => r.list_id));
}
