// Notes TMDB déjà vues, gardées dans le navigateur : l'indice d'un film s'en sert (note lissée),
// et la watchlist n'a plus à redemander chaque film à TMDB à chaque visite.
import { store } from "./store";

const KEY = "projo.v3.votes";
const MAX_ENTRIES = 4000;
const TTL_DAYS = 14;

/** [note moyenne, nombre de votes, jour (depuis 1970) où on l'a vue] */
type Entry = [number, number, number];

let cache: Record<number, Entry> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const today = () => Math.floor(Date.now() / 86400000);

function load() {
  if (!cache) cache = store.get<Record<number, Entry>>(KEY, {});
  return cache;
}

function flush() {
  timer = null;
  const c = load();
  const ids = Object.keys(c);
  if (ids.length > MAX_ENTRIES) {
    // on garde les plus récentes
    ids.sort((a, b) => c[+b][2] - c[+a][2]).slice(MAX_ENTRIES).forEach((id) => delete c[+id]);
  }
  store.set(KEY, c);
}

export function rememberVote(id: number, average: number | undefined, count: number | undefined) {
  if (typeof average !== "number" || typeof count !== "number") return;
  const c = load();
  const old = c[id];
  if (old && old[0] === average && old[1] === count && today() - old[2] < 1) return;
  c[id] = [average, count, today()];
  if (!timer) timer = setTimeout(flush, 1500);
}

/** Note TMDB connue (et pas trop ancienne) d'un film. */
export function knownVote(id: number): { vote_average: number; vote_count: number } | undefined {
  const e = load()[id];
  if (!e || today() - e[2] > TTL_DAYS) return undefined;
  return { vote_average: e[0], vote_count: e[1] };
}
