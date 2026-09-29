"use client";

import { useEffect, useState } from "react";
import { FilmGrid } from "./FilmGrid";
import { useProfile } from "./ProfileProvider";
import { ErrorLine, SecHead, SkeletonGrid } from "./ui";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

const SORTS = [
  { k: "popularity.desc", l: "Populaires" },
  { k: "primary_release_date.desc", l: "Récents" },
  { k: "vote_average.desc", l: "Mieux notés" },
] as const;

/** Films d'un studio (TMDB discover), avec l'indice et le tri. */
export function StudioFilms({ id, name }: { id: number; name: string }) {
  const d = useProfile();
  const [sort, setSort] = useState<(typeof SORTS)[number]["k"]>("popularity.desc");
  const [list, setList] = useState<Ranked[] | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = async (p: number, prev: Ranked[]) => {
    const r = await tmdb<Paged<Movie>>("discover/movie", {
      with_companies: id,
      sort_by: sort,
      page: p + 1,
      ...(sort === "vote_average.desc" ? { "vote_count.gte": 150 } : { "vote_count.gte": 5 }),
    });
    setTotal(r.total_results);
    setPage(p + 1);
    const have = new Set(prev.map((m) => m.id));
    const fresh = r.results.filter((m) => m.poster_path && !have.has(m.id)).map((m) => ({ ...m, _pred: d.predict(m).v }));
    return { list: [...prev, ...fresh], done: p + 1 >= r.total_pages };
  };
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    setList(null);
    setError(null);
    load(0, [])
      .then((r) => {
        if (!alive) return;
        setList(r.list);
        setDone(r.done);
      })
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sort, d.profile]);

  return (
    <section className="section">
      <SecHead title={`Les films de ${name}`} aside={total ? `${total.toLocaleString("fr-FR")} films` : undefined} />
      <div className="filterbar">
        <div className="seg" role="group" aria-label="Tri" style={{ marginLeft: 0 }}>
          {SORTS.map((s) => (
            <button key={s.k} type="button" aria-pressed={sort === s.k} onClick={() => setSort(s.k)}>
              {s.l}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <ErrorLine error={error} />
      ) : !list ? (
        <SkeletonGrid n={12} />
      ) : list.length ? (
        <FilmGrid
          key={sort}
          list={list}
          paged
          loadingMore={more}
          onMore={
            done
              ? undefined
              : () => {
                  setMore(true);
                  load(page, list)
                    .then((r) => {
                      setList(r.list);
                      setDone(r.done);
                    })
                    .finally(() => setMore(false));
                }
          }
        />
      ) : (
        <p className="status">Aucun film de ce studio sur TMDB.</p>
      )}
    </section>
  );
}
