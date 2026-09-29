"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FilmGrid } from "./FilmGrid";
import { useProfile } from "./ProfileProvider";
import { ErrorLine, MineToggle, SecHead, SkeletonGrid } from "./ui";
import { moodBySlug, MOODS } from "@/lib/moods";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

export function MoodTiles({ current }: { current?: string }) {
  return (
    <div className="moods">
      {MOODS.map((m) => (
        <Link key={m.slug} className="mood" href={`/humeurs/${m.slug}`} aria-current={current === m.slug ? "page" : undefined} scroll={false}>
          <h3>{m.t}</h3>
          <p>{m.s}</p>
        </Link>
      ))}
    </div>
  );
}

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
  const onlyMine = d.prefs.onlyMine && d.platforms.size > 0;
  const plat = [...d.platforms].join("|");

  const load = async (from: number, prev: Ranked[]) => {
    if (!mood) return;
    const q: Record<string, string | number> = await mood.q();
    if (onlyMine) Object.assign(q, { with_watch_providers: plat, watch_region: "FR", with_watch_monetization_types: "flatrate|free|ads" });
    const pages = await Promise.all(
      Array.from({ length: BATCH }, (_, k) => tmdb<Paged<Movie>>("discover/movie", { ...q, page: from + k + 1 }).catch(() => null)),
    );
    const total = pages.find(Boolean)?.total_pages ?? 0;
    const have = new Set(prev.map((m) => m.id));
    const fresh = pages
      .flatMap((p) => p?.results ?? [])
      .filter((m) => m.poster_path && !d.seen.has(m.id) && !d.hidden.has(m.id) && !have.has(m.id) && (have.add(m.id), true))
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
  }, [slug, onlyMine, plat, d.profile]);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [slug]);

  if (!mood) return <p className="status err">Cette humeur n'existe pas.</p>;

  return (
    <section className="section" ref={ref}>
      <SecHead title={mood.t} aside={<div className="filterbar" style={{ margin: 0 }}><MineToggle /></div>} />
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
        <p className="status">Rien de neuf pour toi ici. Tu as peut-être déjà tout vu, ou le filtre plateformes est trop strict.</p>
      )}
    </section>
  );
}
