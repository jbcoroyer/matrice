"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filmRow } from "@/lib/db";
import { clearTopSlot, entriesForFilm, loadTop, setTopSlot, type DiaryEntry, type TopFilm } from "@/lib/diary";
import { addWant, formatLabel, isWanted, itemsForFilm, removeWant, type CollectionItem } from "@/lib/collection";
import { listsWithFilm } from "@/lib/lists";
import { CopyDialog } from "./CopyDialog";
import { DiaryList } from "./DiaryEntries";
import { Bookmark, Check, Disc, Dots, Eye, Heart, Journal, List, Share } from "./icons";
import { AddToListDialog } from "./ListDialogs";
import { LogDialog } from "./LogDialog";
import { useProfile, type FilmInput } from "./ProfileProvider";
import { Stars } from "./Stars";

export const DIARY_EVENT = "projo:diary";
const diaryChanged = (id: number) => window.dispatchEvent(new CustomEvent(DIARY_EVENT, { detail: id }));

/** Actions de la fiche : journal, vu, watchlist, note, favori, liste, collection, partage, top 5, pas pour moi. */
export function FilmPanel({ film }: { film: FilmInput }) {
  const d = useProfile();
  const [logging, setLogging] = useState(false);
  const [top, setTop] = useState<TopFilm[]>([]);
  const [copies, setCopies] = useState<CollectionItem[]>([]);
  const [copy, setCopy] = useState<CollectionItem | "new" | null>(null);
  const [inLists, setInLists] = useState(0);
  const [listing, setListing] = useState(false);
  const [wanted, setWanted] = useState(false);
  const more = useRef<HTMLDetailsElement>(null);
  const loadCopies = useCallback(() => {
    if (d.sb) itemsForFilm(d.sb, film.id).then(setCopies, () => {});
  }, [d.sb, film.id]);
  useEffect(loadCopies, [loadCopies]);
  useEffect(() => {
    if (d.sb) isWanted(d.sb, film.id).then(setWanted, () => {});
  }, [d.sb, film.id]);

  const toggleWanted = async () => {
    if (!d.sb || !d.userId) return;
    const on = !wanted;
    setWanted(on);
    closeMore();
    try {
      if (on) await addWant(d.sb, d.userId, filmRow(film));
      else await removeWant(d.sb, film.id);
      d.toast(on ? `« ${film.title} » ajouté à tes envies (à posséder en disque)` : `« ${film.title} » retiré de tes envies`);
    } catch (e) {
      setWanted(!on);
      d.toast(`Échec : ${(e as Error).message}`);
    }
  };
  useEffect(() => {
    if (d.sb && d.userId) listsWithFilm(d.sb, d.userId, film.id).then((s) => setInLists(s.size), () => {});
  }, [d.sb, d.userId, film.id]);
  useEffect(() => {
    if (d.sb && d.userId) loadTop(d.sb, d.userId).then(setTop, () => {});
  }, [d.sb, d.userId]);

  const isSeen = d.seen.has(film.id);
  const isFav = d.favorites.has(film.id);
  const inWl = d.watchlist.has(film.id);
  const isHidden = d.hidden.has(film.id);
  const rating = d.rated.get(film.id) || 0;
  const mySlot = top.find((t) => t.tmdb_id === film.id)?.slot;
  const closeMore = () => more.current?.removeAttribute("open");

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
    closeMore();
  };

  const share = async () => {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: film.title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        d.toast("Lien du film copié");
      }
    } catch {}
  };

  return (
    <>
      <div className="film-actions">
        <button type="button" className="btn primary" onClick={() => setLogging(true)}>
          <Journal />
          Ajouter au journal
        </button>
        <button type="button" className="btn" aria-pressed={isSeen} onClick={() => (isSeen ? d.unmarkSeen(film) : d.markSeen(film))}>
          {isSeen ? <Check /> : <Eye />}
          {isSeen ? "Vu" : "Marquer vu"}
        </button>
        {!isSeen ? (
          <button type="button" className="btn" aria-pressed={inWl} onClick={() => d.toggleWatchlist(film)}>
            <Bookmark className="fillable" />
            Watchlist
          </button>
        ) : null}
        <span className="rate">
          {rating ? "Ta note" : "Noter"}
          <Stars value={rating} onChange={(v) => d.markSeen(film, v)} />
        </span>
        <button type="button" className="btn icon" aria-pressed={isFav} aria-label="Coup de cœur" title="Coup de cœur" onClick={() => d.toggleFavorite(film)}>
          <Heart className="fillable" />
        </button>
        <button type="button" className="btn icon" aria-label="Ajouter à une liste" title="Ajouter à une liste" onClick={() => setListing(true)}>
          <List />
        </button>
        <button
          type="button"
          className="btn icon"
          aria-pressed={copies.length > 0}
          aria-label={copies.length ? "Ajouter un autre exemplaire à ma collection" : "Ajouter à ma collection"}
          title={copies.length ? "Tu possèdes ce film : ajouter un autre exemplaire" : "Ajouter à ma collection"}
          onClick={() => setCopy("new")}
        >
          <Disc />
        </button>
        <details className="more-menu" ref={more}>
          <summary className="btn icon" aria-label="Plus d'options" title="Plus d'options">
            <Dots />
          </summary>
          <div className="menu">
            <label>
              Top 5
              <select value={mySlot ?? 0} onChange={(e) => pickSlot(e.target.value)} aria-label="Place dans ton top 5">
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
            <button
              type="button"
              onClick={() => {
                share();
                closeMore();
              }}
            >
              Partager le film <Share />
            </button>
            {!copies.length ? (
              <button type="button" onClick={toggleWanted}>
                {wanted ? "Retirer de mes envies" : "Envie de l'avoir en disque"}
              </button>
            ) : null}
            {!isSeen ? (
              <button
                type="button"
                onClick={() => {
                  d.toggleHidden(film);
                  closeMore();
                }}
              >
                {isHidden ? "Proposer à nouveau" : "Pas pour moi"}
              </button>
            ) : null}
          </div>
        </details>
      </div>
      {inLists || copies.length || mySlot ? (
        <div className="film-sub">
          {inLists ? (
            <button type="button" onClick={() => setListing(true)}>
              Dans <b>{inLists}</b> de tes listes
            </button>
          ) : null}
          {copies.length ? (
            <span>
              Dans ta collection :{" "}
              {copies.map((c, i) => (
                <button key={c.id} type="button" onClick={() => setCopy(c)} title="Modifier cet exemplaire">
                  {i ? ", " : ""}
                  <b>{formatLabel(c.format)}</b>
                  {c.edition ? ` (${c.edition})` : ""}
                </button>
              ))}
            </span>
          ) : null}
          {mySlot ? (
            <span>
              N° <b>{mySlot}</b> de ton top 5
            </span>
          ) : null}
        </div>
      ) : null}
      {listing ? <AddToListDialog film={film} onClose={() => setListing(false)} onChange={setInLists} /> : null}
      {copy ? <CopyDialog film={film} item={copy === "new" ? undefined : copy} onClose={() => setCopy(null)}
          onSaved={() => {
            loadCopies();
            // le film est maintenant possédé : il quitte la liste d'envies
            if (wanted && d.sb) removeWant(d.sb, film.id).then(() => setWanted(false), () => {});
          }}
        /> : null}
      {logging ? <LogDialog film={film} onClose={() => setLogging(false)} onSaved={() => diaryChanged(film.id)} /> : null}
    </>
  );
}

/** Tes visionnages de ce film (sous le résumé). */
export function FilmHistory({ film }: { film: FilmInput }) {
  const { sb, userId, status } = useProfile();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const load = useCallback(() => {
    if (sb && userId) entriesForFilm(sb, userId, film.id).then(setEntries, () => {});
  }, [sb, userId, film.id]);
  useEffect(() => {
    if (status !== "ready") return;
    load();
    const on = (e: Event) => (e as CustomEvent).detail === film.id && load();
    window.addEventListener(DIARY_EVENT, on);
    return () => window.removeEventListener(DIARY_EVENT, on);
  }, [status, load, film.id]);
  if (!entries.length) return null;
  return (
    <section className="film-history">
      <h2 className="block-title">
        Ton <span>journal</span>
        <span className="aside">{entries.length === 1 ? "1 visionnage" : `${entries.length} visionnages`}</span>
      </h2>
      <DiaryList entries={entries} onChange={load} />
    </section>
  );
}
