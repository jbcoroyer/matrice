// Étagère de la collection : recherche en langage courant, rangement et découpage en planches.
import { directorName, type CollectionItem, type Entry } from "./collection";

export type Arrange = "realisateur" | "titre" | "annee" | "entree";

export const ARRANGE: { k: Arrange; l: string }[] = [
  { k: "realisateur", l: "Réalisateur" },
  { k: "titre", l: "Titre" },
  { k: "annee", l: "Année de sortie" },
  { k: "entree", l: "Date d'entrée" },
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Mots de la recherche qui filtrent au lieu de chercher un titre. */
const TOKENS: { re: RegExp; label: string; test: (e: Entry, seen: Set<number>) => boolean }[] = [
  { re: /\b(4k|uhd)\b/, label: "4K", test: (e) => e.copies.some((c) => c.format === "4k") },
  { re: /\b(blu-?ray|bd)\b/, label: "Blu-ray", test: (e) => e.copies.some((c) => c.format === "bluray") },
  { re: /\bdvd\b/, label: "DVD", test: (e) => e.copies.some((c) => c.format === "dvd") },
  { re: /\bvhs\b/, label: "VHS", test: (e) => e.copies.some((c) => c.format === "vhs") },
  { re: /\b(laserdisc|ld)\b/, label: "LaserDisc", test: (e) => e.copies.some((c) => c.format === "laserdisc") },
  { re: /\bsteelbooks?\b/, label: "Steelbook", test: (e) => e.copies.some((c) => c.packaging === "steelbook" || /steelbook/i.test(c.edition || "")) },
  { re: /\b(collectors?|coffrets?|limitees?|numerotees?)\b/, label: "Édition limitée", test: (e) => e.copies.some((c) => c.edition_no || c.packaging === "collector" || c.packaging === "coffret" || /collector|limit|numérot|numerot|coffret/i.test(c.edition || "")) },
  { re: /\bscelles?\b/, label: "Scellé", test: (e) => e.copies.some((c) => c.sealed) },
  { re: /\bpretes?\b/, label: "Prêté", test: (e) => e.copies.some((c) => c.lent_to) },
  { re: /\b(pas vus?|jamais vus?|non vus?)\b/, label: "Pas encore vu", test: (e, seen) => !seen.has(e.tmdb_id) },
];

export type Query = { text: string; labels: string[]; tests: ((e: Entry, seen: Set<number>) => boolean)[] };

/** « scellé 4k kubrick » → filtres Scellé + 4K, texte « kubrick ». */
export function parseQuery(raw: string): Query {
  let rest = fold(raw);
  const labels: string[] = [];
  const tests: Query["tests"] = [];
  for (const t of TOKENS) {
    if (t.re.test(rest)) {
      rest = rest.replace(t.re, " ");
      labels.push(t.label);
      tests.push(t.test);
    }
  }
  return { text: rest.replace(/\s+/g, " ").trim(), labels, tests };
}

export function matches(e: Entry, q: Query, seen: Set<number>): boolean {
  if (!q.tests.every((t) => t(e, seen))) return false;
  if (!q.text) return true;
  const hay = fold(`${e.film.title} ${directorName(e)} ${e.copies.map((c) => `${c.edition || ""} ${c.publisher || ""}`).join(" ")}`);
  return q.text.split(" ").every((w) => hay.includes(w));
}

const surname = (name: string) => name.trim().split(/\s+/).at(-1) ?? "";
const letterOf = (s: string) => {
  const c = fold(s).replace(/^(le|la|les|l'|the|un|une|a|an)\s+/, "").replace(/^l'/, "").trim()[0] ?? "";
  return /[a-z]/.test(c) ? c.toUpperCase() : "#";
};

export type Plank = { key: string; label: string; copies: { e: Entry; c: CollectionItem }[] };

/** Une planche par lettre (réalisateur, titre), par décennie (année) ou par année d'entrée. */
export function planks(entries: Entry[], by: Arrange): Plank[] {
  const cmpTitle = (a: Entry, b: Entry) => a.film.title.localeCompare(b.film.title, "fr", { sensitivity: "base" });
  const year = (e: Entry) => +(e.film.release_date || "0").slice(0, 4);
  const sorted = entries.slice();
  if (by === "titre") sorted.sort(cmpTitle);
  if (by === "annee") sorted.sort((a, b) => year(a) - year(b) || cmpTitle(a, b));
  if (by === "entree") sorted.sort((a, b) => b.added.localeCompare(a.added));
  // « realisateur » : l'ordre reçu est déjà celui des noms de famille (compareByDirector)
  const keyOf = (e: Entry): [string, string] => {
    if (by === "realisateur") {
      const d = directorName(e);
      return d ? [letterOf(surname(d)), letterOf(surname(d))] : ["~", "Réalisateur inconnu"];
    }
    if (by === "titre") return [letterOf(e.film.title), letterOf(e.film.title)];
    if (by === "annee") {
      const y = year(e);
      return y ? [String(Math.floor(y / 10) * 10), `Années ${Math.floor(y / 10) * 10}`] : ["~", "Sans date"];
    }
    const y = e.added.slice(0, 4);
    return [y, `Entrés en ${y}`];
  };
  const out: Plank[] = [];
  for (const e of sorted) {
    const [key, label] = keyOf(e);
    let p = out.find((x) => x.key === key);
    if (!p) out.push((p = { key, label, copies: [] }));
    for (const c of e.copies) p.copies.push({ e, c });
  }
  // lettres et décennies dans l'ordre, les inconnus à la fin
  if (by !== "entree") out.sort((a, b) => (a.key === "~" ? 1 : b.key === "~" ? -1 : a.key.localeCompare(b.key)));
  return out;
}
