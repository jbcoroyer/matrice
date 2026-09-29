// Bilan de l'année : calculé à partir du journal (diary_entries) de l'année choisie.
import type { SupabaseClient } from "@supabase/supabase-js";
import { check } from "./supabase";
import { store } from "./store";
import { tmdb } from "./tmdb";
import type { Credits, MovieDetail } from "./types";

export type YearEntry = {
  id: string;
  tmdb_id: number;
  watched_on: string;
  rating: number | null;
  rewatch: boolean;
  liked: boolean;
  review: string | null;
  tags: string[];
  films: { title: string; release_date: string | null; poster_path: string | null; genre_ids: number[] } | null;
};

export async function yearEntries(sb: SupabaseClient, userId: string, year: number): Promise<YearEntry[]> {
  const out: YearEntry[] = [];
  for (let from = 0; ; from += 1000) {
    const rows = check(
      await sb
        .from("diary_entries")
        .select("id, tmdb_id, watched_on, rating, rewatch, liked, review, tags, films(title, release_date, poster_path, genre_ids)")
        .eq("user_id", userId)
        .gte("watched_on", `${year}-01-01`)
        .lte("watched_on", `${year}-12-31`)
        .order("watched_on")
        .order("created_at")
        .range(from, from + 999),
    ) as unknown as YearEntry[];
    out.push(...rows.map((r) => ({ ...r, rating: r.rating == null ? null : +r.rating })));
    if (rows.length < 1000) break;
  }
  return out;
}

/* ---------- durée, réalisateurs, acteurs (TMDB, mis en cache localement) ---------- */

export type Facts = { r: number | null; d: [number, string][]; c: [number, string][] };
const FACTS_KEY = "projo.v1.filmfacts";

export async function filmFacts(ids: number[], onProgress: (done: number, total: number) => void): Promise<Map<number, Facts>> {
  const cache = store.get<Record<number, Facts>>(FACTS_KEY, {});
  const todo = ids.filter((id) => !cache[id]);
  let done = ids.length - todo.length;
  onProgress(done, ids.length);
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const id = todo[next++];
      try {
        const m = await tmdb<MovieDetail & { credits: Credits }>(`movie/${id}`, { append_to_response: "credits" });
        cache[id] = {
          r: m.runtime || null,
          d: (m.credits?.crew ?? []).filter((p) => p.job === "Director").map((p) => [p.id, p.name]),
          c: (m.credits?.cast ?? []).slice(0, 5).map((p) => [p.id, p.name]),
        };
      } catch {
        // film introuvable : ignoré dans ces statistiques
      }
      onProgress(++done, ids.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  store.set(FACTS_KEY, cache);
  return new Map(ids.filter((id) => cache[id]).map((id) => [id, cache[id]]));
}

/* ---------- statistiques ---------- */

const count = <K>(keys: K[]) => {
  const m = new Map<K, number>();
  for (const k of keys) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const dayMs = 86400000;
const toDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / dayMs;

export function summarize(entries: YearEntry[]) {
  const films = new Map<number, YearEntry[]>();
  for (const e of entries) films.set(e.tmdb_id, [...(films.get(e.tmdb_id) ?? []), e]);
  const rated = entries.filter((e) => e.rating != null);
  const months = Array.from({ length: 12 }, () => 0);
  for (const e of entries) months[+e.watched_on.slice(5, 7) - 1]++;
  const ratings = Array.from({ length: 10 }, (_, i) => ({ v: (i + 1) / 2, n: rated.filter((e) => e.rating === (i + 1) / 2).length }));

  // meilleur film : sa meilleure note de l'année, puis « j'aime », puis le plus récent
  const best = [...films.values()]
    .map((l) => ({ e: l.reduce((a, b) => ((b.rating ?? 0) > (a.rating ?? 0) || ((b.rating ?? 0) === (a.rating ?? 0) && b.liked && !a.liked) ? b : a)), n: l.length }))
    .filter(({ e }) => (e.rating ?? 0) >= 3.5 || e.liked)
    .sort((a, b) => (b.e.rating ?? 0) - (a.e.rating ?? 0) || +b.e.liked - +a.e.liked || b.e.watched_on.localeCompare(a.e.watched_on))
    .slice(0, 10)
    .map(({ e }) => e);

  const unique = [...films.values()].map((l) => l[0]);
  const genres = count(unique.flatMap((e) => e.films?.genre_ids ?? []));
  const decades = count(unique.map((e) => e.films?.release_date?.slice(0, 3)).filter((d): d is string => !!d).map((d) => +(d + "0")));

  const days = count(entries.map((e) => e.watched_on));
  const dayList = [...new Set(entries.map((e) => toDay(e.watched_on)))].sort((a, b) => a - b);
  let streak = { len: 0, end: 0 };
  for (let i = 0, run = 0; i < dayList.length; i++) {
    run = i && dayList[i] === dayList[i - 1] + 1 ? run + 1 : 1;
    if (run > streak.len) streak = { len: run, end: dayList[i] };
  }
  const iso = (d: number) => new Date(d * dayMs).toISOString().slice(0, 10);

  const mostSeen = [...films.values()].filter((l) => l.length > 1).sort((a, b) => b.length - a.length)[0];

  return {
    total: entries.length,
    films: films.size,
    rewatches: entries.filter((e) => e.rewatch).length,
    reviews: entries.filter((e) => e.review).length,
    liked: new Set(entries.filter((e) => e.liked).map((e) => e.tmdb_id)).size,
    avg: rated.length ? rated.reduce((s, e) => s + (e.rating ?? 0), 0) / rated.length : null,
    months,
    ratings,
    best,
    genres,
    decades,
    first: entries[0],
    last: entries[entries.length - 1],
    busiest: days[0] && days[0][1] > 1 ? { day: days[0][0], n: days[0][1] } : null,
    streak: streak.len > 1 ? { len: streak.len, from: iso(streak.end - streak.len + 1), to: iso(streak.end) } : null,
    mostSeen: mostSeen ? { e: mostSeen[0], n: mostSeen.length } : null,
    tags: count(entries.flatMap((e) => e.tags)).slice(0, 12),
    unique,
  };
}

/** Heures passées, réalisateurs et acteurs les plus vus (à partir des fiches TMDB). */
export function people(entries: YearEntry[], facts: Map<number, Facts>) {
  let minutes = 0;
  let known = 0;
  for (const e of entries) {
    const r = facts.get(e.tmdb_id)?.r;
    if (r) {
      minutes += r;
      known++;
    }
  }
  const films = [...new Set(entries.map((e) => e.tmdb_id))];
  const rank = (pick: (f: Facts) => [number, string][]) => {
    const names = new Map<number, string>();
    const ids: number[] = [];
    for (const id of films) {
      const f = facts.get(id);
      if (!f) continue;
      for (const [pid, name] of pick(f)) {
        names.set(pid, name);
        ids.push(pid);
      }
    }
    return count(ids)
      .filter(([, n]) => n > 1)
      .slice(0, 8)
      .map(([id, n]) => ({ id, name: names.get(id) ?? "", n }));
  };
  return { minutes, known, directors: rank((f) => f.d), actors: rank((f) => f.c) };
}
