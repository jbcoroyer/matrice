import { errorText } from "@/lib/errors";
import { NextRequest, NextResponse } from "next/server";
import { isAllowed, tmdbFetch, TmdbError, ttlFor } from "@/lib/tmdb-server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const p = path.join("/");
  if (!isAllowed(p)) return NextResponse.json({ error: "Ressource non disponible." }, { status: 404 });

  const search: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    if (k !== "api_key") search[k] = v;
  });

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
