import { learnAffinities } from "./predict";
import { KEYS, store } from "./store";
import { tmdb, ApiError } from "./tmdb";
import type { Credits, Library, Movie, Paged, Profile } from "./types";
import type { Progress } from "./profile";

type Row = Record<string, string>;

export function parseCSV(text: string): Row[] {
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
  const h = (rows.shift() || []).map((s) => s.replace(/^﻿/, "").trim());
  return rows.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
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

const WANTED = /^(watched|ratings|watchlist|profile)\.csv$/;

/** Rassemble les CSV utiles, qu'on ait déposé l'archive .zip ou les fichiers un par un. */
export async function readExport(files: File[]): Promise<Record<string, Row[]>> {
  const texts: Record<string, string> = {};
  for (const f of files) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".zip")) Object.assign(texts, await unzip(f, (n) => WANTED.test(n.toLowerCase())));
    else if (name.endsWith(".csv")) texts[name] = await f.text();
  }
  const out: Record<string, Row[]> = {};
  for (const [name, t] of Object.entries(texts)) {
    const key = name.toLowerCase().replace(/^.*\//, "");
    if (key.includes("watchlist")) out.watchlist = parseCSV(t);
    else if (key.includes("rating")) out.ratings = parseCSV(t);
    else if (key.includes("watched")) out.watched = parseCSV(t);
    else if (key.includes("profile")) out.profile = parseCSV(t);
  }
  if (!out.watched && !out.ratings && !out.watchlist)
    throw new Error("Aucun fichier Letterboxd reconnu. Dépose l'archive .zip de l'export, ou watched.csv, ratings.csv et watchlist.csv.");
  return out;
}

type Match = [number, string, number[]] | null;

async function lookup(name: string, year: number, cache: Record<string, Match>): Promise<Match> {
  const k = `${name}|${year}`;
  if (k in cache) return cache[k];
  const pick = (m?: Movie): Match => (m ? [m.id, m.title, m.genre_ids || []] : null);
  let r = await tmdb<Paged<Movie>>("search/movie", { query: name, year: year || undefined, language: "en-US" }).catch(() => null);
  let m = r?.results?.[0];
  if (!m && year) {
    r = await tmdb<Paged<Movie>>("search/movie", { query: name, language: "en-US" }).catch(() => null);
    m = r?.results?.find((x) => Math.abs(+(x.release_date || "0").slice(0, 4) - year) <= 1);
  }
  return (cache[k] = pick(m));
}

export async function importLetterboxd(files: File[], onProgress: (p: Progress) => void): Promise<{ profile: Profile; missed: string[] }> {
  onProgress({ phase: "Lecture de l'export", done: 0, total: 1 });
  const data = await readExport(files);
  const cache = store.get<Record<string, Match>>(KEYS.titleMap, {});

  const keyOf = (r: Row) => `${r.Name}|${r.Year}`;
  const unique = new Map<string, Row>();
  for (const list of [data.watched, data.ratings, data.watchlist]) for (const r of list ?? []) if (r.Name) unique.set(keyOf(r), r);

  // 1. correspondance titre + année → TMDB
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

  const titles: Record<string, string> = {};
  for (const m of matches.values()) if (m) titles[m[0]] = m[1];
  const ids = (list?: Row[]) => (list ?? []).map((r) => matches.get(keyOf(r))).filter((m): m is NonNullable<Match> => !!m);

  const rated: Record<string, number> = {};
  const genresOf = new Map<number, number[]>();
  for (const r of data.ratings ?? []) {
    const m = matches.get(keyOf(r));
    if (m && r.Rating) {
      rated[m[0]] = +r.Rating;
      genresOf.set(m[0], m[2]);
    }
  }
  const lib: Library = {
    seen: [...new Set([...ids(data.watched).map((m) => m[0]), ...Object.keys(rated).map(Number)])],
    rated,
    watchlist: ids(data.watchlist).map((m) => m[0]),
    titles,
  };

  // 2. apprentissage des goûts : réalisateurs, acteurs et genres des films notés
  const ratedIds = Object.keys(rated).map(Number);
  let d2 = 0;
  const films = (
    await Promise.all(
      ratedIds.map(async (id) => {
        const c = await tmdb<Credits>(`movie/${id}/credits`, { language: "en-US" }).catch(() => null);
        onProgress({ phase: "Analyse de tes goûts", done: ++d2, total: ratedIds.length });
        if (!c) return null;
        return {
          rating: rated[id],
          genres: genresOf.get(id) || [],
          directors: c.crew.filter((x) => x.job === "Director").map((x) => x.name),
          cast: c.cast.slice(0, 5).map((x) => x.name),
        };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);

  const { mu, aff } = learnAffinities(films);
  const p = data.profile?.[0];
  const owner = (p?.["Given Name"] || p?.Username || "").trim();
  return {
    profile: { v: 2, owner, source: "letterboxd", mu, aff, lib, updatedAt: new Date().toISOString() },
    missed,
  };
}
