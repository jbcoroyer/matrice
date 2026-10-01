// Export de toutes les données d'un compte (droit à la portabilité) : un fichier JSON complet,
// et le journal en CSV (colonnes proches de celles de Letterboxd).
import type { SupabaseClient } from "@supabase/supabase-js";
import { check } from "./supabase";

async function all<T>(read: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check((await read(from, from + 999)) as never) as unknown as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

export type ExportData = Awaited<ReturnType<typeof collectData>>;

/** Tout ce que le compte possède, lu avec ses propres droits (chacun ne voit que ses lignes). */
export async function collectData(sb: SupabaseClient, userId: string, email: string | null) {
  const films = await all<Record<string, unknown>>((a, b) =>
    sb.from("user_films").select("tmdb_id, watched, watchlist, favorite, rating, watchlisted_at, created_at, updated_at, films(title, release_date)").eq("user_id", userId).order("tmdb_id").range(a, b),
  ).catch(() => all<Record<string, unknown>>((a, b) => sb.from("user_films").select("tmdb_id, watched, watchlist, favorite, rating, created_at, updated_at, films(title, release_date)").eq("user_id", userId).order("tmdb_id").range(a, b)));
  const journal = await all<Record<string, unknown>>((a, b) =>
    sb.from("diary_entries").select("id, tmdb_id, watched_on, rating, rewatch, liked, review, spoilers, tags, created_at, films(title, release_date)").eq("user_id", userId).order("created_at").range(a, b),
  );
  const lists = check(await sb.from("lists").select("*, items:list_items(*, films(title, release_date))").eq("user_id", userId)) as unknown as Record<string, unknown>[];
  const collection = await all<Record<string, unknown>>((a, b) => sb.from("collection_items").select("*, films(title, release_date)").eq("user_id", userId).order("created_at").range(a, b));
  const wants = check(await sb.from("collection_wants").select("tmdb_id, created_at, films(title, release_date)").eq("user_id", userId)) as unknown as Record<string, unknown>[];
  const parcours = check(
    await sb.from("film_sets").select("key, title, subtitle, created_at, follows:set_follows(mode, started_at, archived_at, completed_at), exclusions:set_exclusions(tmdb_id), items:film_set_items(tmdb_id, position, caption, release_date)").eq("owner_id", userId),
  ) as unknown as Record<string, unknown>[];
  // réglages et goûts ne sont lisibles que par leur propriétaire, via la fonction my_profile
  const mine = ((check(await sb.rpc("my_profile")) as Record<string, unknown>[] | null) ?? [])[0] ?? null;
  const profile = mine ? { nom_affiche: mine.display_name ?? null, reglages: mine.settings ?? {}, gouts_appris: mine.taste ?? null } : null;
  return {
    exporte_le: new Date().toISOString(),
    application: "Filmable",
    compte: { id: userId, email },
    profil: profile,
    films,
    journal,
    listes: lists,
    collection,
    envies: wants,
    parcours,
  };
}

const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Le journal en CSV : Date, Name, Year, Rating, Rewatch, Review, Tags. */
export function journalCsv(journal: ExportData["journal"]) {
  const head = ["Date", "Name", "Year", "Rating", "Rewatch", "Liked", "Review", "Tags", "TMDB id"];
  const rows = journal.map((e) => {
    const f = (e.films ?? null) as { title?: string; release_date?: string | null } | null;
    return [e.watched_on, f?.title, (f?.release_date ?? "").slice(0, 4), e.rating, e.rewatch ? "Yes" : "", e.liked ? "Yes" : "", e.review, ((e.tags as string[]) ?? []).join(", "), e.tmdb_id];
  });
  return [head, ...rows].map((r) => r.map(csv).join(",")).join("\n");
}

/** Déclenche le téléchargement d'un fichier généré dans le navigateur. */
export function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
