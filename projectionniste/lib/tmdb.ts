// Client TMDB côté navigateur : passe par le proxy /api/tmdb (le jeton reste sur le serveur).
import { rememberVote } from "./votes";

export const IMG = "https://image.tmdb.org/t/p/";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const memo = new Map<string, Promise<unknown>>();
const queue: (() => void)[] = [];
let active = 0;
/** Requêtes simultanées : assez pour remplir une page vite, peu pour ne pas déclencher les limites de TMDB. */
const MAX = 6;

function limit<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => {
      // la page a changé pendant l'attente : on ne lance pas la requête
      if (signal?.aborted) return reject(new ApiError(0, "Requête annulée."));
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          pump();
        });
    });
    pump();
  });
}

function pump() {
  while (active < MAX && queue.length) queue.shift()!();
}

type Params = Record<string, string | number | boolean | undefined | null>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Mémorise les notes TMDB au passage (fiche ou liste de films). */
function rememberVotes(path: string, body: any) {
  if (Array.isArray(body?.results)) {
    for (const m of body.results) if (m && typeof m.id === "number" && m.title !== undefined) rememberVote(m.id, m.vote_average, m.vote_count);
  } else if (/^movie\/\d+$/.test(path) && typeof body?.id === "number") {
    rememberVote(body.id, body.vote_average, body.vote_count);
  }
}

/** Appelle TMDB. `signal` retire la requête de la file d'attente si la page a changé entre-temps. */
export function tmdb<T = any>(path: string, params: Params = {}, { cache = true, signal }: { cache?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const q = new URLSearchParams();
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const qs = q.toString();
  const url = `/api/tmdb/${path}${qs ? `?${qs}` : ""}`;
  if (cache && memo.has(url)) return memo.get(url) as Promise<T>;

  const run = limit(async () => {
    // jusqu'à 3 essais : réseau coupé, TMDB surchargé (429) ou en panne passagère (5xx)
    for (let attempt = 0; ; attempt++) {
      let r: Response | null = null;
      try {
        r = await fetch(url, { signal });
      } catch {
        if (signal?.aborted) throw new ApiError(0, "Requête annulée.");
      }
      const retryable = !r || r.status === 429 || r.status === 502 || r.status === 503 || r.status === 504;
      if (retryable && attempt < 2) {
        await sleep(500 * 2 ** attempt + Math.random() * 250);
        continue;
      }
      if (!r) throw new ApiError(0, "Connexion impossible. Vérifie ta connexion internet.");
      const body = await r.json().catch(() => null);
      if (!r.ok) throw new ApiError(r.status, (body && body.error) || `Erreur ${r.status}.`);
      rememberVotes(path, body);
      return body as T;
    }
  }, signal);
  if (cache) {
    memo.set(url, run);
    run.catch(() => memo.delete(url));
  }
  return run;
}

/** Applique `fn` à chaque élément, `n` à la fois au plus (au-delà de la file de tmdb(), pour les grandes listes). */
export async function mapLimit<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

export function clearMemo() {
  memo.clear();
}

export function img(path: string | null | undefined, size: "w92" | "w185" | "w342" | "w500" | "w780" | "w1280" | "original") {
  return path ? `${IMG}${size}${path}` : "";
}
