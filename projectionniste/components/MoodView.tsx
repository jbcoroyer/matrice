"use client";

import { useEffect, useRef, useState } from "react";
import { FilmGrid } from "./FilmGrid";
import { useProfile } from "./ProfileProvider";
import { ErrorLine, SecHead, SkeletonGrid } from "./ui";
import { moodBySlug } from "@/lib/moods";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

const BATCH = 4;

/** Une humeur : interroge TMDB en direct (4 pages à la fois), retire le déjà-vu, classe par indice. */
export function MoodResults({ slug }: { slug: string }) {
  const d = useProfile();
  const mood = moodBySlug(slug);
  const [list, setList] = useState<Ranked[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const load = async (from: number, prev: Ranked[]) => {
    if (!mood) return;
    const q: Record<string, string | number> = await mood.q();
    const pages = await Promise.all(
      Array.from({ length: BATCH }, (_, k) => tmdb<Paged<Movie>>("discover/movie", { ...q, page: from + k + 1 }).catch(() => null)),
    );
    const total = pages.find(Boolean)?.total_pages ?? 0;
    const have = new Set(prev.map((m) => m.id));
    const fresh = pages
      .flatMap((p) => p?.results ?? [])
      .filter((m) => m.poster_path && !d.seen.has(m.id) && !have.has(m.id) && (have.add(m.id), true))
      .map((m) => ({ ...m, _pred: d.predict(m).v }))
      .sort((a, b) => b._pred - a._pred);
    setPage(from + BATCH);
    setDone(from + BATCH >= Math.min(total, 40));
    return [...prev, ...fresh];
  };

  useEffect(() => {
    let alive = true;
    setList(null);
    setError(null);
    load(0, [])
      .then((l) => alive && setList(l ?? []))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, d.profile]);

  if (!mood) return <p className="status err">Cette humeur n'existe pas.</p>;

  return (
    <section className="section" ref={ref}>
      <SecHead as="h1" title={mood.t} aside={mood.s} />
      {error ? (
        <ErrorLine error={error} />
      ) : !list ? (
        <SkeletonGrid n={15} />
      ) : list.length ? (
        <FilmGrid
          list={list}
          paged
          loadingMore={more}
          onMore={
            done
              ? undefined
              : () => {
                  setMore(true);
                  load(page, list)
                    .then((l) => l && setList(l))
                    .finally(() => setMore(false));
                }
          }
        />
      ) : (
        <p className="status">Rien de neuf pour toi ici. Tu as peut-être déjà tout vu.</p>
      )}
    </section>
  );
}
