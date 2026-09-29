import type { Movie } from "./types";

export const yearOf = (m: Pick<Movie, "release_date">) => (m.release_date || "").slice(0, 4);

export const num1 = (n: number) => n.toFixed(1).replace(".", ",");

export function runtime(min?: number | null) {
  if (!min) return "";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 3).replace(/\s+\S*$/, "") + "…" : s;
}

export function frDate(iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  return isNaN(+d) ? "" : d.toLocaleDateString("fr-FR", opts);
}

export function plural(n: number, one: string, many = one + "s") {
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? many : one}`;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function stars(r: number) {
  const full = Math.floor(r);
  return "★".repeat(full) + (r - full >= 0.5 ? "½" : "");
}

/** Sépare un titre en partie forte et partie légère : « Dune : Deuxième partie », « Blade Runner 2049 ». */
export function splitTitle(t: string): [string, string] {
  const colon = t.match(/^(.+?)\s*[:–—-]\s+(.+)$/);
  if (colon) return [colon[1], colon[2]];
  const num = t.match(/^(.+?)\s+(\d{1,4}|II|III|IV)$/);
  if (num) return [num[1], num[2]];
  return [t, ""];
}
