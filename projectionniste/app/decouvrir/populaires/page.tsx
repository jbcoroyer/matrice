"use client";

import { useEffect, useState } from "react";
import { FilmGrid } from "@/components/FilmGrid";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, ProfileGate, SecHead, SkeletonGrid } from "@/components/ui";
import { BackLink } from "@/components/Rail";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

type Source = "movie/popular" | "trending/movie/week" | "movie/top_rated" | "movie/now_playing" | "movie/upcoming";
const SOURCES: { k: Source; l: string }[] = [
  { k: "trending/movie/week", l: "Tendances de la semaine" },
  { k: "movie/now_playing", l: "À l'affiche" },
  { k: "movie/upcoming", l: "Bientôt en salles" },
  { k: "movie/popular", l: "Les plus populaires" },
  { k: "movie/top_rated", l: "Les mieux notés" },
];

function Populaires() {
  const d = useProfile();
  const [src, setSrc] = useState<Source>("trending/movie/week");
  // ?liste=now_playing|upcoming|top_rated|popular : lien depuis les rangées de Découvrir
  useEffect(() => {
    const l = new URLSearchParams(location.search).get("liste");
    const hit = SOURCES.find((x) => x.k === `movie/${l}`);
    if (hit) setSrc(hit.k);
  }, []);
  const [list, setList] = useState<Ranked[] | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(1);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = async (p: number, prev: Ranked[]) => {
    const pages = await Promise.all([p + 1, p + 2].map((n) => tmdb<Paged<Movie>>(src, { page: n, region: "FR" })));
    setTotal(Math.min(pages[0].total_pages, 20));
    setPage(p + 2);
    const have = new Set(prev.map((m) => m.id));
    const fresh: Ranked[] = pages
      .flatMap((x) => x.results)
      .filter((m) => m.poster_path && !have.has(m.id) && (have.add(m.id), true))
      .map((m) => ({ ...m, _note: d.seen.has(m.id) ? "Déjà vu" : undefined }));
    return [...prev, ...fresh];
  };

  useEffect(() => {
    let alive = true;
    setList(null);
    setError(null);
    load(0, [])
      .then((l) => alive && setList(l))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, d.profile]);

  return (
    <section className="section">
      <BackLink />
      <SecHead as="h1" title="Tendances" aside="Classements TMDB" />
      <div className="filterbar">
        <div className="seg" role="group" aria-label="Classement">
          {SOURCES.map((s) => (
            <button key={s.k} type="button" aria-pressed={src === s.k} onClick={() => setSrc(s.k)}>
              {s.l}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <ErrorLine error={error} />
      ) : !list ? (
        <SkeletonGrid n={18} />
      ) : (
        <FilmGrid
          key={src}
          list={list}
          paged
          loadingMore={more}
          onMore={
            page < total
              ? () => {
                  setMore(true);
                  load(page, list)
                    .then(setList, setError)
                    .finally(() => setMore(false));
                }
              : undefined
          }
        />
      )}
    </section>
  );
}

export default function Page() {
  return (
    <ProfileGate>
      <Populaires />
    </ProfileGate>
  );
}
