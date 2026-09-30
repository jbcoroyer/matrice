"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GENRE_OPTIONS } from "@/lib/genres";
import { num1 } from "@/lib/format";
import { img } from "@/lib/tmdb";
import { listWatched, type WatchedFilm } from "@/lib/watched";
import { Eye } from "./icons";
import { useProfile } from "./ProfileProvider";
import { EmptyState, ErrorLine, Loader, StartActions } from "./ui";

const decade = (d?: string | null) => {
  const y = +(d || "").slice(0, 4);
  return y ? `${Math.floor(y / 10) * 10}` : "";
};
const STEP = 120;

/** Tous les films que tu as vus, avec ta note (l'ancien onglet « Films vus » de la collection). */
export function WatchedFilms() {
  const { sb, rated } = useProfile();
  const [rows, setRows] = useState<WatchedFilm[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState(0);
  const [dec, setDec] = useState("");
  const [sort, setSort] = useState<"titre" | "annee" | "note">("titre");
  const [limit, setLimit] = useState(STEP);

  useEffect(() => {
    if (sb) listWatched(sb).then(setRows, setError);
  }, [sb]);
  useEffect(() => setLimit(STEP), [q, genre, dec, sort]);

  const decades = useMemo(() => [...new Set((rows ?? []).map((r) => decade(r.films?.release_date)).filter(Boolean))].sort((a, b) => +b - +a), [rows]);
  const list = useMemo(() => {
    if (!rows) return null;
    const needle = q.trim().toLowerCase();
    const l = rows.filter((r) => r.films && (!needle || r.films.title.toLowerCase().includes(needle)) && (!genre || r.films.genre_ids.includes(genre)) && (!dec || decade(r.films.release_date) === dec));
    const cmp = {
      titre: (a: WatchedFilm, b: WatchedFilm) => a.films!.title.localeCompare(b.films!.title, "fr"),
      annee: (a: WatchedFilm, b: WatchedFilm) => (b.films!.release_date || "").localeCompare(a.films!.release_date || ""),
      note: (a: WatchedFilm, b: WatchedFilm) => (rated.get(b.tmdb_id) ?? 0) - (rated.get(a.tmdb_id) ?? 0),
    }[sort];
    return l.sort(cmp);
  }, [rows, q, genre, dec, sort, rated]);

  if (error) return <ErrorLine error={error} />;
  if (!list) return <Loader text="Chargement de tes films vus…" />;
  if (!rows?.length) return (
      <EmptyState title="Aucun film vu pour l'instant" actions={<StartActions />}>
        Tous les films que tu marques comme vus, avec ou sans date, se retrouvent ici. Tu peux aussi le faire depuis la fiche d'un film.
      </EmptyState>
    );

  return (
    <>
      <div className="filterbar">
        <input className="input search-in" type="search" placeholder="Filtrer par titre" aria-label="Filtrer par titre" value={q} onChange={(e) => setQ(e.target.value)} />
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
          Décennie
          <select value={dec} onChange={(e) => setDec(e.target.value)}>
            <option value="">Toutes</option>
            {decades.map((d) => (
              <option key={d} value={d}>
                {d}s
              </option>
            ))}
          </select>
        </label>
        <label>
          Tri
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="titre">Titre</option>
            <option value="annee">Année</option>
            <option value="note">Ta note</option>
          </select>
        </label>
        <span className="count">{list.length.toLocaleString("fr-FR")} films vus</span>
      </div>
      {list.length ? (
        <>
          <div className="vus-grid">
            {list.slice(0, limit).map((r) => (
              <Link key={r.tmdb_id} href={`/film/${r.tmdb_id}`} className="vus-tile" title={`${r.films!.title} (${(r.films!.release_date || "").slice(0, 4)})`}>
                <span className="poster">{r.films!.poster_path ? <img src={img(r.films!.poster_path, "w185")} alt={r.films!.title} loading="lazy" /> : <span className="noimg">{r.films!.title}</span>}</span>
                {rated.get(r.tmdb_id) ? (
                  <span className="badge" aria-label={`Ta note : ${num1(rated.get(r.tmdb_id)!)}`}>
                    <Eye />
                    {num1(rated.get(r.tmdb_id)!)}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
          {list.length > limit ? (
            <div className="more" style={{ marginTop: 30, textAlign: "center" }}>
              <button type="button" className="btn ghost" onClick={() => setLimit(limit + STEP)}>
                Voir plus ({list.length - limit})
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="status">Aucun film ne correspond à ces filtres.</p>
      )}
    </>
  );
}
