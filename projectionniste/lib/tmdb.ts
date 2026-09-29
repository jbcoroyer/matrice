// Client TMDB côté navigateur : passe par le proxy /api/tmdb (le jeton reste sur le serveur).
import type { ProviderOffers } from "./types";

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
  providerCache.clear();
}

/* ---------- plateformes ---------- */

const providerCache = new Map<number, Promise<ProviderOffers | null>>();

export function providers(id: number): Promise<ProviderOffers | null> {
  let p = providerCache.get(id);
  if (!p) {
    p = tmdb<{ results?: Record<string, ProviderOffers> }>(`movie/${id}/watch/providers`)
      .then((r) => r.results?.FR ?? null)
      .catch(() => null);
    providerCache.set(id, p);
  }
  return p;
}

/** Abonnements, gratuits et avec pub : ce qu'on peut voir sans payer à l'acte. */
export function streamable(fr: ProviderOffers | null | undefined) {
  if (!fr) return [];
  return [...(fr.flatrate ?? []), ...(fr.free ?? []), ...(fr.ads ?? [])];
}

/** Retire les doublons du type « Netflix » / « Netflix basic with Ads ». */
export function dedupeProviders<T extends { provider_name: string }>(arr: T[] | undefined): T[] {
  const k = new Set<string>();
  return (arr ?? []).filter((p) => {
    const n = p.provider_name.toLowerCase().split(/[\s+]/)[0];
    if (k.has(n)) return false;
    k.add(n);
    return true;
  });
}

export function img(path: string | null | undefined, size: "w92" | "w185" | "w342" | "w500" | "w780" | "w1280" | "original") {
  return path ? `${IMG}${size}${path}` : "";
}
