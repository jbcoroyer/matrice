// Import d'une collection depuis un CSV (tableur, autre application de collection).
import type { SupabaseClient } from "@supabase/supabase-js";
import { filmRow } from "./db";
import { fetchExtra, saveItem, type CollectionItem, type Format, type ItemInput } from "./collection";
import { tmdb } from "./tmdb";
import type { Movie, Paged } from "./types";

export type ImportRow = { title: string; year: string; input: ItemInput };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Découpe un CSV avec le séparateur donné (guillemets et retours à la ligne gérés). */
function parseDelimited(text: string, d: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') (cur += '"'), i++;
        else q = false;
      } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === d) (row.push(cur), (cur = ""));
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else cur += ch;
  }
  if (cur || row.length) (row.push(cur), rows.push(row));
  return rows.filter((r) => r.some((c) => c.trim()));
}

const HEADS: Record<string, string[]> = {
  title: ["titre", "title", "film", "nom", "name"],
  year: ["annee", "year", "date de sortie"],
  format: ["format", "support", "type"],
  edition: ["edition", "version"],
  publisher: ["editeur", "publisher", "label", "distributeur"],
  condition: ["etat", "condition"],
  notes: ["notes", "note", "commentaire", "comment"],
  acquired: ["acquis le", "acquis", "date d'acquisition", "acquired", "date d'achat"],
};

export function parseFormat(s: string): Format | null {
  const t = norm(s);
  if (!t) return null;
  if (/4k|uhd/.test(t)) return "4k";
  if (/steel/.test(t)) return "steelbook";
  if (/collector/.test(t)) return "collector";
  if (/blu|^bd$|bluray/.test(t)) return "bluray";
  if (/dvd/.test(t)) return "dvd";
  if (/vhs/.test(t)) return "vhs";
  if (/laser|^ld$/.test(t)) return "laserdisc";
  if (/num|digital|dematerial/.test(t)) return "numerique";
  return null;
}

function parseCondition(s: string): { condition: ItemInput["condition"]; sealed: boolean } {
  const t = norm(s);
  const sealed = /scell|sealed|blister/.test(t);
  if (/neuf|new|mint|scell|sealed|blister/.test(t)) return { condition: "neuf", sealed };
  if (/tres bon|very good|excellent/.test(t)) return { condition: "tres_bon", sealed };
  if (/use|worn|poor|abime/.test(t)) return { condition: "use", sealed };
  if (/bon|good/.test(t)) return { condition: "bon", sealed };
  return { condition: null, sealed };
}

function parseDate(s: string): string | null {
  const t = s.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = t.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  return fr ? `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}` : null;
}

/** Lit le CSV : titre obligatoire, format reconnu obligatoire ; le reste est facultatif. */
export function readRows(text: string): { rows: ImportRow[]; unread: string[] } {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const d = [";", "\t", ","].map((c) => [c, first.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const table = parseDelimited(text.replace(/^﻿/, ""), d);
  const head = (table.shift() ?? []).map(norm);
  const col: Record<string, number> = {};
  for (const [k, names] of Object.entries(HEADS)) col[k] = head.findIndex((h) => names.includes(h));
  const rows: ImportRow[] = [];
  const unread: string[] = [];
  for (const r of table) {
    const get = (k: string) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");
    const title = get("title");
    if (!title) continue;
    const format = parseFormat(get("format"));
    if (!format) {
      unread.push(`${title} : format « ${get("format") || "vide"} » non reconnu`);
      continue;
    }
    const cond = parseCondition(get("condition"));
    rows.push({
      title,
      year: get("year").slice(0, 4),
      input: {
        format,
        edition: get("edition") || null,
        publisher: get("publisher") || null,
        edition_no: null,
        edition_of: null,
        sealed: cond.sealed,
        condition: cond.condition,
        notes: get("notes") || null,
        acquired_on: parseDate(get("acquired")),
        lent_to: null,
        lent_on: null,
        photo_path: null,
      },
    });
  }
  return { rows, unread };
}

export type ImportReport = { added: number; duplicates: number; missing: string[] };

/** Retrouve chaque film sur TMDB puis l'ajoute ; les exemplaires déjà présents sont ignorés. */
export async function importRows(sb: SupabaseClient, userId: string, rows: ImportRow[], existing: CollectionItem[], onProgress: (done: number) => void): Promise<ImportReport> {
  const have = new Set(existing.map((c) => `${c.tmdb_id}|${c.format}|${(c.edition || "").toLowerCase()}`));
  const report: ImportReport = { added: 0, duplicates: 0, missing: [] };
  let next = 0;
  let done = 0;
  const work = async () => {
    while (next < rows.length) {
      const r = rows[next++];
      try {
        const res = await tmdb<Paged<Movie>>("search/movie", { query: r.title, year: r.year || undefined, include_adult: false });
        const hit = res.results.find((m) => norm(m.title) === norm(r.title)) ?? res.results[0];
        if (!hit) report.missing.push(r.title);
        else {
          const key = `${hit.id}|${r.input.format}|${(r.input.edition || "").toLowerCase()}`;
          if (have.has(key)) report.duplicates++;
          else {
            have.add(key);
            const extra = await fetchExtra(hit.id).catch(() => null);
            await saveItem(sb, userId, filmRow(hit), r.input, undefined, extra);
            report.added++;
          }
        }
      } catch {
        report.missing.push(r.title);
      }
      onProgress(++done);
    }
  };
  await Promise.all([work(), work(), work()]);
  return report;
}

export const CSV_MODEL = "Titre;Année;Format;Édition;Éditeur;État;Notes;Acquis le\nBlade Runner 2049;2017;4K UHD;Steelbook;Sony;Neuf;Précommande;2018-01-20\nParasite;2019;Blu-ray;Édition collector;Bac Films;Très bon;;12/03/2020\n";
