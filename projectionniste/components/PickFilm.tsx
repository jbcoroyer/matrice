"use client";

import { useEffect, useRef, useState } from "react";
import { img, tmdb } from "@/lib/tmdb";
import type { Movie, Paged } from "@/lib/types";
import { Check } from "./icons";
import type { FilmInput } from "./ProfileProvider";

/**
 * Recherche d'un film à ajouter (collection, liste).
 * Avec `picked`, la fenêtre reste ouverte pour en ajouter plusieurs à la suite.
 */
export function PickFilm({
  title = "Quel film ajouter ?",
  picked,
  onPick,
  onClose,
}: {
  title?: string;
  picked?: Set<number>;
  onPick: (m: FilmInput) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Movie[]>([]);
  useEffect(() => ref.current?.showModal(), []);
  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => {
      tmdb<Paged<Movie>>("search/movie", { query: q.trim() })
        .then((r) => setHits(r.results.slice(0, 8)))
        .catch(() => setHits([]));
    }, 220);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <dialog ref={ref} className="dialog" onClose={onClose} onCancel={onClose}>
      <h2>{title}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const first = hits.find((m) => !picked?.has(m.id));
          if (first) {
            onPick(first);
            if (picked) input.current?.select();
          }
        }}
      >
        <input ref={input} className="input" autoFocus placeholder="Titre du film" aria-label="Titre du film" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <ul className="pick-list">
        {hits.map((m) => {
          const has = picked?.has(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={has}
                onClick={() => {
                  onPick(m);
                  if (picked) input.current?.select();
                }}
              >
                <span className="thumb">{m.poster_path ? <img src={img(m.poster_path, "w92")} alt="" /> : null}</span>
                <span>
                  <b>{m.title}</b> <span className="dim">{(m.release_date || "").slice(0, 4)}</span>
                </span>
                {has ? (
                  <span className="pick-done">
                    <Check /> Ajouté
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="dialog-actions">
        <span style={{ flex: 1 }} />
        <button type="button" className={picked ? "btn" : "btn ghost"} onClick={onClose}>
          {picked ? "Terminé" : "Annuler"}
        </button>
      </div>
    </dialog>
  );
}
