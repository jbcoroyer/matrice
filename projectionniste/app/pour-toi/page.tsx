"use client";

import { useMemo, useState } from "react";
import { FilmGrid } from "@/components/FilmGrid";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, MineToggle, ProfileGate, SecHead, SkeletonGrid } from "@/components/ui";
import { GENRE_OPTIONS } from "@/lib/genres";
import { genreIds } from "@/lib/predict";
import { useAsync, useMineFilter, useRecs } from "@/lib/hooks";
import { clearRecs } from "@/lib/recs";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Ranked } from "@/lib/types";

const DECADES = [
  { v: "", l: "Toutes" },
  { v: "2020", l: "Années 2020" },
  { v: "2010", l: "Années 2010" },
  { v: "2000", l: "Années 2000" },
  { v: "1990", l: "Années 1990" },
  { v: "1980", l: "Années 1980" },
  { v: "old", l: "Avant 1980" },
];

function PourToi() {
  const { profile } = useProfile();
  const [force, setForce] = useState(0);
  const recs = useRecs(force);
  const [genre, setGenre] = useState(0);
  const [decade, setDecade] = useState("");
  const [maxRt, setMaxRt] = useState(0);
  const [sort, setSort] = useState<"score" | "pred" | "recent">("score");

  const filtered = useMemo(() => {
    if (!recs.data) return undefined;
    let l = recs.data.slice();
    if (genre) l = l.filter((m) => genreIds(m).includes(genre));
    if (decade) {
      l = l.filter((m) => {
        const y = +(m.release_date || "0").slice(0, 4);
        return decade === "old" ? y < 1980 : y >= +decade && y < +decade + 10;
      });
    }
    if (sort === "pred") l.sort((a, b) => (b._pred ?? 0) - (a._pred ?? 0));
    if (sort === "recent") l.sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    return l;
  }, [recs.data, genre, decade, sort]);

  const mine = useMineFilter(filtered);

  // la durée n'est pas dans les résultats de recommandation : on la demande seulement si le filtre est actif
  const runtimeFiltered = useAsync<Ranked[]>(
    async () => {
      const l = mine.data!.slice(0, 120);
      const det = await Promise.all(l.map((m) => tmdb<Movie>(`movie/${m.id}`).catch(() => null)));
      return l.filter((_, i) => det[i]?.runtime && det[i]!.runtime! <= maxRt);
    },
    [mine.data, maxRt],
    !!mine.data && maxRt > 0,
  );

  const final = maxRt ? runtimeFiltered.data : mine.data;
  const loading = recs.loading || mine.loading || (maxRt > 0 && runtimeFiltered.loading);
  const error = recs.error || mine.error || runtimeFiltered.error;

  return (
    <section className="section">
      <SecHead as="h1" title="Pour toi" aside="Tiré des films que tu as notés 4,5 ou 5" />
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
          Époque
          <select value={decade} onChange={(e) => setDecade(e.target.value)}>
            {DECADES.map((d) => (
              <option key={d.v} value={d.v}>
                {d.l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Durée
          <select value={maxRt} onChange={(e) => setMaxRt(+e.target.value)}>
            <option value={0}>Peu importe</option>
            <option value={100}>Moins de 1 h 40</option>
            <option value={130}>Moins de 2 h 10</option>
          </select>
        </label>
        <label>
          Tri
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="score">Pertinence</option>
            <option value="pred">Indice</option>
            <option value="recent">Plus récents</option>
          </select>
        </label>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            clearRecs();
            setForce((f) => f + 1);
          }}
        >
          Recalculer
        </button>
        {final ? <span className="count">{final.length} films</span> : null}
      </div>
      {error ? (
        <ErrorLine error={error} onRetry={recs.reload} />
      ) : loading || !final ? (
        <SkeletonGrid n={15} />
      ) : final.length ? (
        <FilmGrid key={`${genre}|${decade}|${maxRt}|${sort}|${profile?.updatedAt}`} list={final} />
      ) : (
        <p className="status">Aucun film ne correspond. Retire un filtre ou coche d'autres plateformes.</p>
      )}
    </section>
  );
}

export default function Page() {
  return (
    <div>
      <ProfileGate>
        <PourToi />
      </ProfileGate>
    </div>
  );
}
