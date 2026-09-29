// Client TMDB côté navigateur : passe par le proxy /api/tmdb (le jeton reste sur le serveur).

export const IMG = "https://image.tmdb.org/t/p/";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const memo = new Map<string, Promise<unknown>>();
const queue: (() => void)[] = [];
let active = 0;
const MAX = 10;

function limit<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => {
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

export function tmdb<T = any>(path: string, params: Params = {}, { cache = true }: { cache?: boolean } = {}): Promise<T> {
  const q = new URLSearchParams();
  for (const k of Object.keys(params).sort()) {
    const v = params[k];
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const qs = q.toString();
  const url = `/api/tmdb/${path}${qs ? `?${qs}` : ""}`;
  if (cache && memo.has(url)) return memo.get(url) as Promise<T>;

  const run = limit(async () => {
    let r: Response;
    try {
      r = await fetch(url);
    } catch {
      throw new ApiError(0, "Connexion impossible. Vérifie ta connexion internet.");
    }
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new ApiError(r.status, (body && body.error) || `Erreur ${r.status}.`);
    return body as T;
  });
  if (cache) {
    memo.set(url, run);
    run.catch(() => memo.delete(url));
  }
  return run;
}

export function clearMemo() {
  memo.clear();
}

export function img(path: string | null | undefined, size: "w92" | "w185" | "w342" | "w500" | "w780" | "w1280" | "original") {
  return path ? `${IMG}${size}${path}` : "";
}
