// « Qui l'a vu » : membres ayant vu un film (fonction film_viewers, respecte leur choix de visibilité).
import type { SupabaseClient } from "@supabase/supabase-js";
import { check } from "./supabase";

export type Viewer = { user_id: string; name: string; avatar_url: string | null; rating: number | null; favorite: boolean };
export type Viewers = { total: number; avg: number | null; list: Viewer[] };

type Row = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  rating: number | string | null;
  favorite: boolean;
  total: number;
  avg_rating: number | string | null;
};

export async function filmViewers(sb: SupabaseClient, tmdbId: number, max = 24): Promise<Viewers> {
  const rows = check(await sb.rpc("film_viewers", { film: tmdbId, max_rows: max })) as Row[];
  return {
    total: rows[0] ? +rows[0].total : 0,
    avg: rows[0]?.avg_rating != null ? +rows[0].avg_rating : null,
    list: rows.map((r) => ({
      user_id: r.user_id,
      name: r.display_name || r.username || "Un cinéphile",
      avatar_url: r.avatar_url,
      rating: r.rating == null ? null : +r.rating,
      favorite: r.favorite,
    })),
  };
}
