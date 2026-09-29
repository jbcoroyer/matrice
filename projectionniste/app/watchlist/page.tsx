"use client";

import { useMemo, useState } from "react";
import { FilmGrid } from "@/components/FilmGrid";
import { ErrorLine, MineToggle, ProfileGate, SecHead, SkeletonGrid } from "@/components/ui";
import { GENRE_OPTIONS } from "@/lib/genres";
import { genreIds } from "@/lib/predict";
import { useMineFilter, useWatchlistMovies } from "@/lib/hooks";

function Watchlist() {
  const wl = useWatchlistMovies();
  const [genre, setGenre] = useState(0);
  const [sort, setSort] = useState<"pred" | "short" | "recent" | "old">("pred");
  const sorted = useMemo(() => {
    if (!wl.data) return undefined;
    let l = wl.data.slice();
    if (genre) l = l.filter((m) => genreIds(m).includes(genre));
    if (sort === "short") l.sort((a, b) => (a.runtime || 999) - (b.runtime || 999));
    if (sort === "recent") l.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    if (sort === "old") l.sort((a, b) => (a.release_date || "9").localeCompare(b.release_date || "9"));
    return l;
  }, [wl.data, genre, sort]);
  const mine = useMineFilter(sorted);
  const error = wl.error || mine.error;

  return (
    <section className="section">
      <SecHead as="h1" title="Watchlist" aside="Classée par ton indice" />
      <div className="filterbar">
        <MineToggle />
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
            <option value="pred">Indice</option>
            <option value="short">Plus courts d'abord</option>
            <option value="recent">Plus récents</option>
            <option value="old">Plus anciens</option>
          </select>
        </label>
        {mine.data ? <span className="count">{mine.data.length} films</span> : null}
      </div>
      {error ? (
        <ErrorLine error={error} onRetry={wl.reload} />
      ) : !mine.data ? (
        <SkeletonGrid n={15} />
      ) : mine.data.length ? (
        <FilmGrid key={`${genre}|${sort}`} list={mine.data} />
      ) : wl.data?.length ? (
        <p className="status">Aucun film de ta watchlist ne correspond (filtre genre ou plateformes).</p>
      ) : (
        <p className="status">Ta watchlist est vide. Ajoute des films avec le bouton ＋ des affiches, ou importe ton Letterboxd dans Réglages.</p>
      )}
    </section>
  );
}

export default function Page() {
  return (
    <div>
      <ProfileGate>
        <Watchlist />
      </ProfileGate>
    </div>
  );
}
