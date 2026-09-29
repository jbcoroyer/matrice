// Critiques publiques (entrées du journal avec critique), « j'aime » et commentaires.
import type { SupabaseClient } from "@supabase/supabase-js";
import { check } from "./supabase";

export type Author = { display_name: string | null; username: string | null } | null;
export const authorName = (a: Author) => a?.display_name || a?.username || "Un cinéphile";

export type Review = {
  id: string;
  user_id: string;
  tmdb_id: number;
  watched_on: string | null;
  rating: number | null;
  rewatch: boolean;
  liked: boolean;
  review: string;
  spoilers: boolean;
  review_public: boolean;
  tags: string[];
  created_at: string;
  author: Author;
  films: { title: string; release_date: string | null; poster_path: string | null; backdrop_path: string | null } | null;
  likes: number;
  comments: number;
};

type Raw = Omit<Review, "likes" | "comments"> & { likes: { count: number }[]; comments: { count: number }[] };

const COLS =
  "id, user_id, tmdb_id, watched_on, rating, rewatch, liked, review, spoilers, review_public, tags, created_at, author:profiles!diary_entries_profile_fk(display_name, username), films(title, release_date, poster_path, backdrop_path), likes:review_likes(count), comments:review_comments(count)";

const norm = (r: Raw): Review => ({ ...r, rating: r.rating == null ? null : +r.rating, likes: r.likes[0]?.count ?? 0, comments: r.comments[0]?.count ?? 0 });

/** Critiques publiques d'un film (les 200 plus récentes), triées par date ou par « j'aime ». */
export async function filmReviews(sb: SupabaseClient, tmdbId: number, sort: "recent" | "popular"): Promise<Review[]> {
  const rows = (
    check(
      await sb
        .from("diary_entries")
        .select(COLS)
        .eq("tmdb_id", tmdbId)
        .eq("review_public", true)
        .not("review", "is", null)
        .order("created_at", { ascending: false })
        .limit(200),
    ) as unknown as Raw[]
  ).map(norm);
  if (sort === "popular") rows.sort((a, b) => b.likes - a.likes || b.comments - a.comments || b.created_at.localeCompare(a.created_at));
  return rows;
}

export async function getReview(sb: SupabaseClient, id: string): Promise<Review | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = check(await sb.from("diary_entries").select(COLS).eq("id", id).not("review", "is", null).maybeSingle()) as unknown as Raw | null;
  return row ? norm(row) : null;
}

/** Parmi ces critiques, celles que j'aime. */
export async function myLikes(sb: SupabaseClient, userId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = check(await sb.from("review_likes").select("entry_id").eq("user_id", userId).in("entry_id", ids)) as { entry_id: string }[];
  return new Set(rows.map((r) => r.entry_id));
}

export async function setLike(sb: SupabaseClient, userId: string, entryId: string, on: boolean) {
  check(
    on
      ? await sb.from("review_likes").upsert({ entry_id: entryId, user_id: userId }, { onConflict: "entry_id,user_id", ignoreDuplicates: true })
      : await sb.from("review_likes").delete().eq("entry_id", entryId).eq("user_id", userId),
  );
}

export type Comment = { id: string; user_id: string; body: string; created_at: string; author: Author };

const CCOLS = "id, user_id, body, created_at, author:profiles(display_name, username)";

export async function listComments(sb: SupabaseClient, entryId: string): Promise<Comment[]> {
  return check(await sb.from("review_comments").select(CCOLS).eq("entry_id", entryId).order("created_at")) as unknown as Comment[];
}

export async function addComment(sb: SupabaseClient, userId: string, entryId: string, body: string): Promise<Comment> {
  return check(await sb.from("review_comments").insert({ entry_id: entryId, user_id: userId, body: body.trim() }).select(CCOLS).single()) as unknown as Comment;
}

export async function deleteComment(sb: SupabaseClient, id: string) {
  check(await sb.from("review_comments").delete().eq("id", id));
}
