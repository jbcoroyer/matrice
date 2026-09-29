// Import d'un export Letterboxd (archive .zip ou CSV) vers la base.
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureFilms, filmRow, saveFilmStates, updateProfile } from "./db";
import { learnAffinities } from "./predict";
import { KEYS, store } from "./store";
import { check, chunks } from "./supabase";
import { tmdb, ApiError } from "./tmdb";
import type { Credits, FilmRow, Movie, Paged } from "./types";

export type Progress = { phase: string; done: number; total: number };

type Row = Record<string, string>;

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.map((r) => (r.length ? [r[0].replace(/^﻿/, ""), ...r.slice(1)] : r));
}

/** CSV avec une ligne d'en-tête → objets. */
export function parseTable(text: string): Row[] {
  const rows = parseCSV(text);
  const h = (rows.shift() || []).map((s) => s.trim());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
}

/**
 * Export d'une liste Letterboxd : un bloc d'en-tête (nom, description, URL),
 * une ligne vide, puis les films (Position, Name, Year, URL, Description).
 */
export function parseListExport(text: string) {
  const rows = parseCSV(text);
  let i = rows.findIndex((r) => r[0] === "Date" && r.includes("Name"));
  if (i < 0) return null;
  const head = rows[i];
  const meta = Object.fromEntries(head.map((k, j) => [k.trim(), rows[i + 1]?.[j] ?? ""]));
  i = rows.findIndex((r, j) => j > i && r[0] === "Position");
  const films = i < 0 ? [] : rows.slice(i + 1).filter((r) => r.length > 2).map((r) => Object.fromEntries(rows[i].map((k, j) => [k.trim(), r[j] ?? ""])));
  return { name: meta.Name || "Liste", description: meta.Description || "", url: meta.URL || "", tags: meta.Tags || "", films };
}

/** Lecteur zip minimal (archive d'export Letterboxd), sans dépendance. */
async function unzip(file: Blob, wanted: (name: string) => boolean): Promise<Record<string, string>> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let e = buf.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("Cette archive zip est illisible.");
  const count = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const out: Record<string, string> = {};
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const xlen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const loff = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (!wanted(name)) continue;
    const start = loff + 30 + dv.getUint16(loff + 26, true) + dv.getUint16(loff + 28, true);
    const data = buf.slice(start, start + csize);
    let bytes: Uint8Array;
    if (method === 0) bytes = data;
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else continue;
    out[name] = dec.decode(bytes);
  }
  return out;
}

export type Export = {
  watched: Row[];
  ratings: Row[];
  watchlist: Row[];
  diary: Row[];
  reviews: Row[];
  likes: Row[];
  profile: Row | null;
  lists: NonNullable<ReturnType<typeof parseListExport>>[];
};

/** Rassemble les fichiers utiles, qu'on ait déposé l'archive .zip ou des CSV. */
export async function readExport(files: File[]): Promise<Export> {
  const texts: Record<string, string> = {};
  for (const f of files) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".zip")) Object.assign(texts, await unzip(f, (n) => n.toLowerCase().endsWith(".csv")));
    else if (name.endsWith(".csv")) texts[name] = await f.text();
  }
  const out: Export = { watched: [], ratings: [], watchlist: [], diary: [], reviews: [], likes: [], profile: null, lists: [] };
  for (const [path, t] of Object.entries(texts)) {
    const p = path.toLowerCase().replace(/\\/g, "/");
    // l'export contient aussi deleted/ et orphaned/ (éléments supprimés, souvent vides) : on les ignore,
    // sinon leurs diary.csv, watched.csv… écraseraient les vrais
    if (/(^|\/)(deleted|orphaned)\//.test(p)) continue;
    const parts = p.split("/");
    const base = parts[parts.length - 1];
    const dir = parts.length > 1 ? parts[parts.length - 2] : "";
    if (dir === "lists") {
      const l = parseListExport(t);
      if (l) out.lists.push(l);
    } else if (dir === "likes") {
      if (base === "films.csv") out.likes = parseTable(t);
    } else if (base === "watched.csv") out.watched = parseTable(t);
    else if (base === "ratings.csv") out.ratings = parseTable(t);
    else if (base === "watchlist.csv") out.watchlist = parseTable(t);
    else if (base === "diary.csv") out.diary = parseTable(t);
    else if (base === "reviews.csv") out.reviews = parseTable(t);
    else if (base === "profile.csv") out.profile = parseTable(t)[0] ?? null;
  }
  if (!out.watched.length && !out.ratings.length && !out.watchlist.length && !out.diary.length)
    throw new Error("Aucun fichier Letterboxd reconnu. Dépose l'archive .zip de l'export (Réglages → Données → Exporter sur Letterboxd).");
  return out;
}

type Match = FilmRow | null;

async function lookup(name: string, year: number, cache: Record<string, Match>): Promise<Match> {
  const k = `${name}|${year}`;
  if (k in cache) return cache[k];
  const pick = (m?: Movie): Match => (m ? filmRow(m) : null);
  let r = await tmdb<Paged<Movie>>("search/movie", { query: name, year: year || undefined, language: "fr-FR" }).catch(() => null);
  let m = r?.results?.[0];
  if (!m && year) {
    r = await tmdb<Paged<Movie>>("search/movie", { query: name, language: "fr-FR" }).catch(() => null);
    m = r?.results?.find((x) => Math.abs(+(x.release_date || "0").slice(0, 4) - year) <= 1);
  }
  return (cache[k] = pick(m));
}

const splitTags = (s?: string) =>
  (s || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
const num = (s?: string) => (s && !isNaN(+s) && +s > 0 ? +s : null);
const dateOrNull = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

export type ImportSummary = { films: number; watched: number; rated: number; watchlist: number; diary: number; reviews: number; lists: number; missed: string[] };

export async function importLetterboxd(
  sb: SupabaseClient,
  userId: string,
  files: File[],
  onProgress: (p: Progress) => void,
): Promise<ImportSummary> {
  onProgress({ phase: "Lecture de l'export", done: 0, total: 1 });
  const ex = await readExport(files);
  const cache = store.get<Record<string, Match>>(KEYS.titleMap, {});

  // 1. correspondance titre + année → TMDB, pour chaque film cité dans l'export
  const keyOf = (r: Row) => `${r.Name}|${r.Year}`;
  const unique = new Map<string, Row>();
  const allRows = [...ex.watched, ...ex.ratings, ...ex.watchlist, ...ex.diary, ...ex.reviews, ...ex.likes, ...ex.lists.flatMap((l) => l.films)];
  for (const r of allRows) if (r.Name) unique.set(keyOf(r), r);
  const total = unique.size;
  let done = 0;
  const matches = new Map<string, Match>();
  const missed: string[] = [];
  await Promise.all(
    [...unique.entries()].map(async ([k, r]) => {
      const m = await lookup(r.Name, +r.Year, cache);
      matches.set(k, m);
      if (!m) missed.push(`${r.Name} (${r.Year})`);
      onProgress({ phase: "Correspondance avec TMDB", done: ++done, total });
    }),
  );
  store.set(KEYS.titleMap, cache);
  if (total && missed.length > total * 0.6) throw new ApiError(0, "TMDB n'a reconnu presque aucun film. Vérifie ta connexion puis réessaie.");
  const idOf = (r: Row) => matches.get(keyOf(r))?.tmdb_id ?? null;

  // 2. cache des films
  const films = [...matches.values()].filter((m): m is FilmRow => !!m);
  onProgress({ phase: "Enregistrement des films", done: 0, total: 1 });
  await ensureFilms(sb, films);

  // 3. état de chaque film : vu, note, watchlist, favori (= « like » Letterboxd)
  const state = new Map<number, { watched: boolean; watchlist: boolean; favorite: boolean; rating: number | null }>();
  const get = (id: number) => {
    let s = state.get(id);
    if (!s) state.set(id, (s = { watched: false, watchlist: false, favorite: false, rating: null }));
    return s;
  };
  for (const r of [...ex.watched, ...ex.diary]) {
    const id = idOf(r);
    if (id) get(id).watched = true;
  }
  for (const r of ex.ratings) {
    const id = idOf(r);
    if (id) Object.assign(get(id), { watched: true, rating: num(r.Rating) });
  }
  for (const r of ex.likes) {
    const id = idOf(r);
    if (id) get(id).favorite = true;
  }
  for (const r of ex.watchlist) {
    const id = idOf(r);
    if (id && !get(id).watched) get(id).watchlist = true;
  }
  const stateRows = [...state.entries()].map(([tmdb_id, s]) => ({ tmdb_id, ...s }));
  await saveFilmStates(sb, userId, stateRows, (d) => onProgress({ phase: "Enregistrement de ton historique", done: d, total: stateRows.length }));

  // 4. journal : diary.csv, enrichi des critiques de reviews.csv
  const reviewKey = (r: Row) => `${keyOf(r)}|${r["Watched Date"] || ""}`;
  const reviewsBy = new Map<string, Row>();
  for (const r of ex.reviews) reviewsBy.set(reviewKey(r), r);
  const entries: Record<string, unknown>[] = [];
  const entryOf = (r: Row, review?: Row) => {
    const id = idOf(r);
    if (!id) return null;
    return {
      user_id: userId,
      tmdb_id: id,
      letterboxd_uri: r["Letterboxd URI"] || null,
      watched_on: dateOrNull(r["Watched Date"]) || dateOrNull(r.Date),
      rating: num(r.Rating),
      rewatch: /^yes$/i.test(r.Rewatch || ""),
      review: review?.Review || null,
      spoilers: /spoiler/i.test(review?.Spoilers || ""),
      tags: splitTags(r.Tags || review?.Tags),
    };
  };
  for (const r of ex.diary) {
    const rev = reviewsBy.get(reviewKey(r));
    if (rev) reviewsBy.delete(reviewKey(r));
    const e = entryOf(r, rev);
    if (e) entries.push(e);
  }
  // critiques sans entrée de journal correspondante
  for (const rev of reviewsBy.values()) {
    const e = entryOf(rev, rev);
    if (e) entries.push(e);
  }
  // une même entrée ne doit apparaître qu'une fois par paquet (sinon l'upsert échoue)
  const withUri = [...new Map(entries.filter((e) => e.letterboxd_uri).map((e) => [e.letterboxd_uri, e])).values()];
  const withoutUri = entries.filter((e) => !e.letterboxd_uri);
  let d = 0;
  for (const part of chunks(withUri)) {
    check(await sb.from("diary_entries").upsert(part, { onConflict: "user_id,letterboxd_uri" }));
    onProgress({ phase: "Import du journal", done: (d += part.length), total: entries.length });
  }
  for (const part of chunks(withoutUri)) {
    check(await sb.from("diary_entries").insert(part));
    onProgress({ phase: "Import du journal", done: (d += part.length), total: entries.length });
  }

  // 5. listes : recréées à l'identique à chaque import
  let li = 0;
  for (const l of ex.lists) {
    onProgress({ phase: "Import des listes", done: ++li, total: ex.lists.length });
    const row = { user_id: userId, title: l.name.slice(0, 120), description: l.description || null, letterboxd_url: l.url || null, is_public: false };
    const saved = check(
      l.url
        ? await sb.from("lists").upsert(row, { onConflict: "user_id,letterboxd_url" }).select("id").single()
        : await sb.from("lists").insert(row).select("id").single(),
    ) as { id: string };
    check(await sb.from("list_items").delete().eq("list_id", saved.id));
    const seenIds = new Set<number>();
    const items = l.films
      .map((f, i) => ({ id: idOf(f), pos: +f.Position || i + 1, note: f.Description || null }))
      .filter((x): x is { id: number; pos: number; note: string | null } => !!x.id && !seenIds.has(x.id) && (seenIds.add(x.id), true))
      .map((x) => ({ list_id: saved.id, tmdb_id: x.id, position: x.pos, note: x.note }));
    for (const part of chunks(items)) check(await sb.from("list_items").insert(part));
  }

  // 6. top 5 : les films favoris du profil Letterboxd
  const favUris = splitTags(ex.profile?.["Favorite Films"]);
  if (favUris.length) {
    const byUri = new Map<string, number>();
    for (const r of [...ex.watched, ...ex.ratings, ...ex.watchlist]) {
      const id = idOf(r);
      if (id && r["Letterboxd URI"]) byUri.set(r["Letterboxd URI"], id);
    }
    const top = favUris
      .map((u) => byUri.get(u))
      .filter((x): x is number => !!x)
      .slice(0, 5)
      .map((tmdb_id, i) => ({ user_id: userId, slot: i + 1, tmdb_id }));
    if (top.length) {
      check(await sb.from("top_films").delete().eq("user_id", userId));
      check(await sb.from("top_films").insert(top));
    }
  }

  // 7. goûts : réalisateurs, acteurs et genres des films notés
  const rated = stateRows.filter((r) => r.rating);
  const genresOf = new Map(films.map((f) => [f.tmdb_id, f.genre_ids || []]));
  let d2 = 0;
  const learned = (
    await Promise.all(
      rated.map(async (r) => {
        const c = await tmdb<Credits>(`movie/${r.tmdb_id}/credits`, { language: "en-US" }).catch(() => null);
        onProgress({ phase: "Analyse de tes goûts", done: ++d2, total: rated.length });
        if (!c) return null;
        return {
          rating: r.rating!,
          genres: genresOf.get(r.tmdb_id) || [],
          directors: c.crew.filter((x) => x.job === "Director").map((x) => x.name),
          cast: c.cast.slice(0, 5).map((x) => x.name),
        };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);
  const taste = learnAffinities(learned);
  const owner = (ex.profile?.["Given Name"] || ex.profile?.Username || "").trim();
  await updateProfile(sb, userId, { taste: { ...taste, importedAt: new Date().toISOString() }, ...(owner ? { display_name: owner } : {}) });

  return {
    films: films.length,
    watched: stateRows.filter((r) => r.watched).length,
    rated: rated.length,
    watchlist: stateRows.filter((r) => r.watchlist).length,
    diary: entries.length,
    reviews: entries.filter((e) => e.review).length,
    lists: ex.lists.length,
    missed,
  };
}
