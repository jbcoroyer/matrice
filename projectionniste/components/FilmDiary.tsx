"use client";

import { useCallback, useEffect, useState } from "react";
import { filmRow } from "@/lib/db";
import { clearTopSlot, entriesForFilm, loadTop, setTopSlot, type DiaryEntry, type TopFilm } from "@/lib/diary";
import { DiaryList } from "./DiaryEntries";
import { LogDialog } from "./LogDialog";
import { useProfile, type FilmInput } from "./ProfileProvider";

/** Sur la fiche : enregistrer un visionnage, historique de ce film, place dans le top 5. */
export function FilmDiary({ film }: { film: FilmInput }) {
  const { sb, userId, status, toast } = useProfile();
  const [entries, setEntries] = useState<DiaryEntry[] | null>(null);
  const [top, setTop] = useState<TopFilm[]>([]);
  const [logging, setLogging] = useState(false);

  const load = useCallback(() => {
    if (!sb || !userId) return;
    entriesForFilm(sb, film.id).then(setEntries, () => setEntries([]));
    loadTop(sb, userId).then(setTop, () => {});
  }, [sb, userId, film.id]);

  useEffect(() => {
    if (status === "ready") load();
  }, [status, load]);

  if (status !== "ready") return null;
  const mySlot = top.find((t) => t.tmdb_id === film.id)?.slot;

  const pickSlot = async (v: string) => {
    if (!sb || !userId) return;
    try {
      if (v === "0") {
        if (mySlot) await clearTopSlot(sb, userId, mySlot);
        toast(`« ${film.title} » retiré de ton top 5`);
      } else {
        await setTopSlot(sb, userId, filmRow(film), +v);
        toast(`« ${film.title} » en n° ${v} de ton top 5`);
      }
      setTop(await loadTop(sb, userId));
    } catch (e) {
      toast(`Échec : ${(e as Error).message}`);
    }
  };

  return (
    <div className="film-diary">
      <div className="film-actions">
        <button type="button" className="btn primary" onClick={() => setLogging(true)}>
          Enregistrer un visionnage
        </button>
        <label className="top-pick">
          Top 5
          <select value={mySlot ?? 0} onChange={(e) => pickSlot(e.target.value)}>
            <option value={0}>—</option>
            {[1, 2, 3, 4, 5].map((n) => {
              const occ = top.find((t) => t.slot === n);
              return (
                <option key={n} value={n}>
                  n° {n}
                  {occ && occ.tmdb_id !== film.id ? ` (remplace ${occ.films?.title ?? "un film"})` : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      {entries && entries.length ? (
        <div className="film-history">
          <h2>Ton journal ({entries.length})</h2>
          <DiaryList entries={entries} onChange={load} />
        </div>
      ) : null}
      {logging ? <LogDialog film={film} onClose={() => setLogging(false)} onSaved={load} /> : null}
    </div>
  );
}
