// Appels TMDB côté serveur uniquement : le jeton ne quitte jamais le serveur.

const BASE = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3/";

export class TmdbError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Durée de cache (secondes) selon la fraîcheur attendue de la ressource. */
export function ttlFor(path: string): number {
  if (path.startsWith("find/")) return 30 * 86400;
  if (path.startsWith("search/")) return 3600;
  if (/^(movie\/(now_playing|upcoming|popular|top_rated)|trending\/|discover\/)/.test(path)) return 3 * 3600;
  if (path.endsWith("watch/providers")) return 12 * 3600;
  return 86400;
}

type Params = Record<string, string | number | boolean | undefined | null>;

export async function tmdbFetch<T = unknown>(path: string, params: Params = {}): Promise<T> {
  const token = (process.env.TMDB_TOKEN || process.env.TMDB_API_KEY || "").trim();
  if (!token) throw new TmdbError(500, "Clé TMDB absente côté serveur : renseigne TMDB_TOKEN dans .env.local.");

  const q = new URLSearchParams({ language: "fr-FR" });
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  const bearer = token.startsWith("eyJ");
  if (!bearer) q.set("api_key", token);
  const url = `${BASE}${path}?${q}`;
  const headers: Record<string, string> = { accept: "application/json" };
  if (bearer) headers.Authorization = `Bearer ${token}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    let r: Response;
    try {
      r = await fetch(url, { headers, next: { revalidate: ttlFor(path) }, signal: AbortSignal.timeout(12000) });
    } catch {
      throw new TmdbError(502, "TMDB ne répond pas. Réessaie dans un instant.");
    }
    if (r.status === 429) {
      await new Promise((s) => setTimeout(s, 800 * (attempt + 1)));
      continue;
    }
    if (r.status === 404) throw new TmdbError(404, "Introuvable sur TMDB.");
    if (r.status === 401) throw new TmdbError(500, "TMDB refuse la clé configurée sur le serveur.");
    if (!r.ok) throw new TmdbError(502, `TMDB a répondu ${r.status}.`);
    return (await r.json()) as T;
  }
  throw new TmdbError(429, "TMDB limite les requêtes. Patiente quelques secondes.");
}

/** Chemins que le proxy public accepte de relayer. */
const ALLOWED: RegExp[] = [
  /^configuration$/,
  /^movie\/\d+$/,
  /^movie\/\d+\/(recommendations|similar|credits|watch\/providers|videos|release_dates|keywords)$/,
  /^movie\/(now_playing|upcoming|popular|top_rated)$/,
  /^trending\/movie\/(day|week)$/,
  /^discover\/movie$/,
  /^search\/(movie|keyword|person|multi)$/,
  /^find\/tt\d+$/,
  /^person\/\d+$/,
  /^person\/\d+\/movie_credits$/,
  /^watch\/providers\/movie$/,
];

export function isAllowed(path: string): boolean {
  return ALLOWED.some((r) => r.test(path));
}
