"use client";

import Link from "next/link";
import { ParcoursTeaser } from "@/components/Parcours";
import { FilmCard } from "@/components/FilmCard";
import { useProfile } from "@/components/ProfileProvider";
import { Tonight } from "@/components/Tonight";
import { Today } from "@/components/Today";
import { TrailLine } from "@/components/Trail";
import { Onboarding } from "@/components/Onboarding";
import { useAsync } from "@/lib/hooks";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged } from "@/lib/types";

/**
 * Les films qui bougent en ce moment : le classement « du jour » de TMDB, c'est-à-dire ce qui est le plus
 * regardé, cherché et noté aujourd'hui, en salles ou non. Sans les films que tu as déjà vus.
 */
function Populaires() {
  const { seen, status } = useProfile();
  const films = useAsync(async () => {
    const pages = await Promise.all([1, 2].map((page) => tmdb<Paged<Movie>>("trending/movie/day", { page }).catch(() => null)));
    return [...new Map(pages.flatMap((p) => p?.results ?? []).filter((m) => m.poster_path).map((m) => [m.id, m])).values()];
  }, []);
  const list = (films.data ?? []).filter((m) => status !== "ready" || !seen.has(m.id)).slice(0, 8);
  if (films.data && !list.length) return null;
  return (
    <section className="section salles" aria-labelledby="pop-title">
      <div className="sec-head">
        <h2 id="pop-title">
          Populaires <span>du moment</span>
        </h2>
        <span className="aside">
          Ce qui bouge le plus aujourd'hui · <Link href="/decouvrir/populaires">Tous les classements →</Link>
        </span>
      </div>
      <div className="salles-grid" aria-busy={!films.data}>
        {films.data
          ? list.map((m) => <FilmCard key={m.id} m={m} />)
          : Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="card">
                <div className="poster sk" />
                <div className="sk sk-line w80" />
              </div>
            ))}
      </div>
    </section>
  );
}

/**
 * Découvrir : une proposition du jour, ce qui est populaire en ce moment, de quoi choisir un film
 * (une phrase ou une envie). Les chemins vers un cinéaste ou un mouvement sont dans Parcours.
 */
export default function Decouvrir() {
  return (
    <>
      <h1 className="sr-only">Découvrir</h1>
      <Onboarding />
      <Today heading="h2" onReady={() => {}} />
      <div className="discover">
        <TrailLine />
        <ParcoursTeaser />
        <Populaires />
        <Tonight />
      </div>
    </>
  );
}
