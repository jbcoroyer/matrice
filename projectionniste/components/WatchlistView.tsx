"use client";

import { useMemo, useState } from "react";
import { FilmGrid } from "@/components/FilmGrid";
import Link from "next/link";
import { EmptyState, ErrorLine, SkeletonGrid } from "@/components/ui";
import { GENRE_OPTIONS, genreIds } from "@/lib/genres";
import { useWatchlistMovies } from "@/lib/hooks";

/** Les films à voir, dans l'ordre où on les a ajoutés (onglet « À voir » du Journal). */
export function WatchlistView() {
  const [genre, setGenre] = useState(0);
  const [sort, setSort] = useState<"added" | "first" | "short" | "recent" | "old">("added");
  const wl = useWatchlistMovies(sort === "short");
  const sorted = useMemo(() => {
    if (!wl.data) return undefined;
    let l = wl.data.slice();
    if (sort === "first") l.reverse();
    if (genre) l = l.filter((m) => genreIds(m).includes(genre));
    if (sort === "short") l.sort((a, b) => (a.runtime || 999) - (b.runtime || 999));
    if (sort === "recent") l.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    if (sort === "old") l.sort((a, b) => (a.release_date || "9").localeCompare(b.release_date || "9"));
    return l;
  }, [wl.data, genre, sort]);
  const error = wl.error;

  return (
    <section className="watchlist-view">
      <div className="filterbar">
        <label>
          Genre
          <select value={genre} onChange={(e) => setGenre(+e.target.value)}>
            <option value={0}>Tous</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tri
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="added">Ajoutés récemment</option>
            <option value="first">Ajoutés en premier</option>
            <option value="short">Plus courts d'abord</option>
            <option value="recent">Plus récents</option>
            <option value="old">Plus anciens</option>
          </select>
        </label>
        {sorted ? (
          <span className="count" aria-live="polite">
            {sorted.length} films{wl.refining ? " · calcul des durées…" : ""}
          </span>
        ) : null}
      </div>
      {error ? (
        <ErrorLine error={error} onRetry={wl.reload} />
      ) : !sorted ? (
        <SkeletonGrid n={15} />
      ) : sorted.length ? (
        <FilmGrid key={`${genre}|${sort}`} list={sorted} />
      ) : wl.data?.length ? (
        <p className="status">Aucun film de ta watchlist ne correspond à ce genre.</p>
      ) : (
        <EmptyState
          title="Ta watchlist est vide"
          actions={
            <>
              <Link className="btn primary" href="/decouvrir">
                Voir les idées du jour
              </Link>
              <Link className="btn ghost" href="/parametres#import">
                Importer mon Letterboxd
              </Link>
            </>
          }
        >
          Les films que tu veux voir un jour. Ajoute-en avec le bouton + des affiches, ou depuis la fiche d'un film.
        </EmptyState>
      )}
    </section>
  );
}
