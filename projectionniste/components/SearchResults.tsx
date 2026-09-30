"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FilmGrid } from "./FilmGrid";
import { FadeImg } from "./Poster";
import { useProfile } from "./ProfileProvider";
import { ErrorLine, SecHead, SkeletonGrid } from "./ui";
import { img, tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Person, Ranked } from "@/lib/types";

type PersonHit = Person & { known_for?: Movie[] };

export function SearchResults({ q }: { q: string }) {
  const [films, setFilms] = useState<Ranked[] | null>(null);
  const [people, setPeople] = useState<PersonHit[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(1);
  const [more, setMore] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const fetchPage = (p: number) =>
    tmdb<Paged<Movie>>("search/movie", { query: q, include_adult: false, page: p }).then((r) => {
      setTotal(r.total_pages);
      setPage(p);
      return (r.results || []).filter((m) => m.poster_path || (m.vote_count || 0) > 5);
    });

  useEffect(() => {
    if (!q) return;
    let alive = true;
    setError(null);
    setFilms(null);
    fetchPage(1)
      .then((l) => alive && setFilms(l.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))))
      .catch((e) => alive && setError(e));
    tmdb<Paged<PersonHit>>("search/person", { query: q, include_adult: false })
      .then((r) => alive && setPeople((r.results || []).filter((p) => p.profile_path).slice(0, 8)))
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, attempt]);

  if (!q)
    return (
      <section className="section">
        <SecHead as="h1" title="Recherche" />
        <p className="status">Tape un titre, un cinéaste ou une actrice dans la barre de recherche (raccourci : « / »).</p>
      </section>
    );

  const list = films;

  return (
    <>
      <h1 className="sr-only">Résultats pour « {q} »</h1>
      {people.length ? (
        <section className="section">
          <SecHead title="Personnes" />
          <ul className="people">
            {people.map((p) => (
              <li key={p.id}>
                <Link href={`/personne/${p.id}`}>
                  <span className="ph">{p.profile_path ? <FadeImg src={img(p.profile_path, "w92")} alt="" /> : null}</span>
                  <span>
                    <span className="n">{p.name}</span>
                    <span className="r">{(p.known_for || []).slice(0, 2).map((m) => m.title).filter(Boolean).join(", ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="section">
        <SecHead title={`Films : « ${q} »`} />
        {error ? (
          <ErrorLine error={error} onRetry={() => setAttempt((a) => a + 1)} />
        ) : !list ? (
          <SkeletonGrid n={10} />
        ) : list.length ? (
          <FilmGrid
            list={list}
            paged
            loadingMore={more}
            onMore={
              page < total
                ? () => {
                    setMore(true);
                    fetchPage(page + 1)
                      .then((l) => setFilms((f) => [...(f ?? []), ...l.filter((m) => !f?.some((x) => x.id === m.id))]))
                      .catch(setError)
                      .finally(() => setMore(false));
                  }
                : undefined
            }
          />
        ) : (
          <p className="status">Aucun film trouvé pour « {q} ». Essaie le titre original ou anglais.</p>
        )}
      </section>
    </>
  );
}
