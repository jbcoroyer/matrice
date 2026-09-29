"use client";

import { useCallback, useEffect, useState } from "react";
import { filmRow } from "@/lib/db";
import { clearTopSlot, entriesForFilm, loadTop, setTopSlot, type DiaryEntry, type TopFilm } from "@/lib/diary";
import { formatLabel, itemsForFilm, type CollectionItem } from "@/lib/collection";
import { CopyDialog } from "./CopyDialog";
import { DiaryList } from "./DiaryEntries";
import { Bookmark, Eye, Heart } from "./icons";
import { LogDialog } from "./LogDialog";
import { useProfile, type FilmInput } from "./ProfileProvider";
import { Stars } from "./Stars";

const DIARY_EVENT = "projo:diary";
const diaryChanged = (id: number) => window.dispatchEvent(new CustomEvent(DIARY_EVENT, { detail: id }));

/** Bloc d'actions de la fiche : vu, favori, watchlist, note, journal, top 5, pas pour moi, partage. */
export function FilmPanel({ film }: { film: FilmInput }) {
  const d = useProfile();
  const [logging, setLogging] = useState(false);
  const [top, setTop] = useState<TopFilm[]>([]);
  const [copies, setCopies] = useState<CollectionItem[]>([]);
  const [copy, setCopy] = useState<CollectionItem | "new" | null>(null);
  const loadCopies = useCallback(() => {
    if (d.sb) itemsForFilm(d.sb, film.id).then(setCopies, () => {});
  }, [d.sb, film.id]);
  useEffect(loadCopies, [loadCopies]);
  const isSeen = d.seen.has(film.id);
  const isFav = d.favorites.has(film.id);
  const inWl = d.watchlist.has(film.id);
  const isHidden = d.hidden.has(film.id);
  const rating = d.rated.get(film.id) || 0;

  useEffect(() => {
    if (d.sb && d.userId) loadTop(d.sb, d.userId).then(setTop, () => {});
  }, [d.sb, d.userId]);
  const mySlot = top.find((t) => t.tmdb_id === film.id)?.slot;

  const pickSlot = async (v: string) => {
    if (!d.sb || !d.userId) return;
    try {
      if (v === "0") mySlot && (await clearTopSlot(d.sb, d.userId, mySlot));
      else await setTopSlot(d.sb, d.userId, filmRow(film), +v);
      setTop(await loadTop(d.sb, d.userId));
      d.toast(v === "0" ? "Retiré de ton top 5" : `En n° ${v} de ton top 5`);
    } catch (e) {
      d.toast(`Échec : ${(e as Error).message}`);
    }
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: film.title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        d.toast("Lien copié");
      }
    } catch {}
  };

  return (
    <div className="panel">
      <div className="panel-toggles">
        <button type="button" aria-pressed={isSeen} onClick={() => (isSeen ? d.unmarkSeen(film) : d.markSeen(film))}>
          <Eye />
          <span>{isSeen ? "Vu" : "Pas vu"}</span>
        </button>
        <button type="button" aria-pressed={isFav} onClick={() => d.toggleFavorite(film)}>
          <Heart />
          <span>Favori</span>
        </button>
        <button type="button" aria-pressed={inWl} disabled={isSeen} title={isSeen ? "Déjà vu" : undefined} onClick={() => d.toggleWatchlist(film)}>
          <Bookmark />
          <span>Watchlist</span>
        </button>
      </div>
      <div className="panel-rate">
        <span>{rating ? "Ta note" : "Noter"}</span>
        <Stars value={rating} onChange={(v) => d.markSeen(film, v)} />
      </div>
      <button type="button" className="panel-main" onClick={() => setLogging(true)}>
        Ajouter au journal…
      </button>
      <div className="panel-copies">
        {copies.length ? <span className="panel-label">Dans ta collection</span> : null}
        {copies.map((c) => (
          <button key={c.id} type="button" className="copy" onClick={() => setCopy(c)} title="Modifier cet exemplaire">
            <b>{formatLabel(c.format)}</b>
            {c.edition ? <span>{c.edition}</span> : null}
          </button>
        ))}
        <button type="button" className="link-btn quiet" onClick={() => setCopy("new")}>
          {copies.length ? "+ Un autre exemplaire" : "+ Ajouter à ma collection"}
        </button>
      </div>
      <div className="panel-more">
        <label>
          Top 5
          <select value={mySlot ?? 0} onChange={(e) => pickSlot(e.target.value)} aria-label="Place dans ton top 5">
            <option value={0}>—</option>
            {[1, 2, 3, 4, 5].map((n) => {
              const occ = top.find((t) => t.slot === n);
              return (
                <option key={n} value={n}>
                  n° {n}
                  {occ && occ.tmdb_id !== film.id ? ` (à la place de ${occ.films?.title ?? "un film"})` : ""}
                </option>
              );
            })}
          </select>
        </label>
        {!isSeen ? (
          <button type="button" className="link-btn quiet" onClick={() => d.toggleHidden(film)}>
            {isHidden ? "Proposer à nouveau" : "Pas pour moi"}
          </button>
        ) : null}
        <button type="button" className="link-btn quiet" onClick={share}>
          Partager
        </button>
      </div>
      {copy ? <CopyDialog film={film} item={copy === "new" ? undefined : copy} onClose={() => setCopy(null)} onSaved={loadCopies} /> : null}
      {logging ? <LogDialog film={film} onClose={() => setLogging(false)} onSaved={() => diaryChanged(film.id)} /> : null}
    </div>
  );
}

/** Tes visionnages de ce film (sous le résumé). */
export function FilmHistory({ film }: { film: FilmInput }) {
  const { sb, status } = useProfile();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const load = useCallback(() => {
    if (sb) entriesForFilm(sb, film.id).then(setEntries, () => {});
  }, [sb, film.id]);
  useEffect(() => {
    if (status !== "ready") return;
    load();
    const on = (e: Event) => (e as CustomEvent).detail === film.id && load();
    window.addEventListener(DIARY_EVENT, on);
    return () => window.removeEventListener(DIARY_EVENT, on);
  }, [status, load, film.id]);
  if (!entries.length) return null;
  return (
    <div className="film-history">
      <h2>
        Ton journal <span className="dim">· {entries.length === 1 ? "1 visionnage" : `${entries.length} visionnages`}</span>
      </h2>
      <DiaryList entries={entries} onChange={load} />
    </div>
  );
}
