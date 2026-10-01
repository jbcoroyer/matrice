import { errorText } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";
import { clientIp, hit } from "@/lib/ratelimit";
import { isAllowed, tmdbFetch, TmdbError, ttlFor } from "@/lib/tmdb-server";

/** Appels par minute : par adresse IP, et pour toute l'instance (le quota TMDB est partagé). */
const PER_IP = 1200;
const GLOBAL = 6000;

const refuse = (status: number, error: string, retry?: number) =>
  NextResponse.json({ error }, { status, headers: retry ? { "Retry-After": String(retry) } : undefined });

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const p = path.join("/");
  if (!isAllowed(p)) return NextResponse.json({ error: "Ressource non disponible." }, { status: 404 });

  // un autre site ne peut pas utiliser ce relais : seules les pages de Filmable l'appellent
  const site = req.headers.get("sec-fetch-site");
  if (site === "cross-site") return refuse(403, "Accès refusé.");
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return refuse(403, "Accès refusé.");
    } catch {
      return refuse(403, "Accès refusé.");
    }
  }

  const g = hit("global", GLOBAL);
  if (!g.ok) return refuse(503, "Le service est très sollicité. Réessaie dans un instant.", g.retry);
  const l = hit(`ip:${clientIp(req.headers)}`, PER_IP);
  if (!l.ok) return refuse(429, "Trop de requêtes. Patiente quelques secondes.", l.retry);

  // des paramètres raisonnables : pas de texte démesuré, pas de page absurde
  if (req.nextUrl.search.length > 800) return refuse(414, "Requête trop longue.");
  const search: Record<string, string> = {};
  let bad = false;
  req.nextUrl.searchParams.forEach((v, k) => {
    if (k === "api_key") return;
    if (v.length > 200 || k.length > 40 || (k === "page" && (!/^\d+$/.test(v) || +v > 500))) bad = true;
    search[k] = v;
  });
  if (bad) return refuse(400, "Paramètres invalides.");

  try {
    const data = await tmdbFetch(p, search);
    const ttl = ttlFor(p);
    return NextResponse.json(data, {
      headers: { "Cache-Control": `public, max-age=${Math.min(ttl, 900)}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 4}` },
    });
  } catch (e) {
    const status = e instanceof TmdbError ? e.status : 502;
    return NextResponse.json({ error: errorText(e) }, { status });
  }
}
