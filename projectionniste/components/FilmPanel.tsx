"use client";

import { errorText } from "@/lib/errors";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { filmRow } from "@/lib/db";
import { DIARY_EVENT, diaryChanged, entriesForFilm, type DiaryEntry } from "@/lib/diary";
import { addWant, formatLabel, isWanted, itemsForFilm, removeWant, type CollectionItem } from "@/lib/collection";
import { listsWithFilm } from "@/lib/lists";
import { CopyDialog } from "./CopyDialog";
import { DiaryList } from "./DiaryEntries";
import { Bookmark, Check, Disc, Dots, Eye, Heart, Journal, List, Share } from "./icons";
import { AddToListDialog } from "./ListDialogs";
import { LogDialog } from "./LogDialog";
import { useProfile, type FilmInput } from "./ProfileProvider";
import { Stars } from "./Stars";


/** Actions de la fiche : trois gestes visibles (vu, watchlist, disque), la note, et un menu « Plus » (journal daté, coup de cœur, liste, partage). */
export function FilmPanel({ film }: { film: FilmInput }) {
  const d = useProfile();
  const [logging, setLogging] = useState(false);
  const [copies, setCopies] = useState<CollectionItem[]>([]);
  const [copy, setCopy] = useState<CollectionItem | "new" | null>(null);
  const [inLists, setInLists] = useState(0);
  const [listing, setListing] = useState(false);
  const [wanted, setWanted] = useState(false);
  const more = useRef<HTMLDetailsElement>(null);
  const signedIn = d.status === "ready";
  const loadCopies = useCallback(() => {
    if (d.sb && signedIn) itemsForFilm(d.sb, film.id).then(setCopies, () => {});
  }, [d.sb, signedIn, film.id]);
  useEffect(loadCopies, [loadCopies]);
  useEffect(() => {
    if (d.sb && signedIn) isWanted(d.sb, film.id).then(setWanted, () => {});
  }, [d.sb, signedIn, film.id]);

  const toggleWanted = async () => {
    if (!d.sb || !d.userId) return;
    const on = !wanted;
    setWanted(on);
    closeMore();
    try {
      if (on) await addWant(d.sb, d.userId, filmRow(film));
      else await removeWant(d.sb, film.id);
      d.toast(on ? `« ${film.title} » ajouté à ce que tu cherches` : `« ${film.title} » retiré de ce que tu cherches`, undefined, on ? { label: "Voir", href: "/collection" } : undefined);
    } catch (e) {
      setWanted(!on);
      d.toast(`Échec : ${errorText(e)}`);
    }
  };
  useEffect(() => {
    if (d.sb && d.userId && signedIn) listsWithFilm(d.sb, d.userId, film.id).then((s) => setInLists(s.size), () => {});
  }, [d.sb, d.userId, signedIn, film.id]);

  const isSeen = d.seen.has(film.id);
  const isFav = d.favorites.has(film.id);
  const inWl = d.watchlist.has(film.id);
  const rating = d.rated.get(film.id) || 0;
  const closeMore = () => more.current?.removeAttribute("open");

  const share = async () => {
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: film.title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        d.toast("Lien du film copié");
      }
    } catch {}
  };

  // visiteur sans compte : on invite à créer un compte plutôt que de montrer des boutons qui ne feraient rien
  if (!signedIn && d.status !== "loading")
    return (
      <div className="film-invite">
        <p>Crée un compte pour noter ce film, l'ajouter à ta watchlist, le journaliser et garder la trace de ce que tu as vu.</p>
        <div className="row-actions">
          <Link className="btn primary" href="/">
            Créer un compte
          </Link>
          <Link className="btn" href="/">
            Se connecter
          </Link>
        </div>
      </div>
    );

  return (
    <>
      <div className="film-actions">
        <button type="button" className={isSeen ? "btn" : "btn primary"} aria-pressed={isSeen} onClick={() => (isSeen ? d.unmarkSeen(film) : d.markSeen(film))}>
          {isSeen ? <Check /> : <Eye />}
          {isSeen ? "Vu" : "Je l'ai vu"}
        </button>
        {!isSeen ? (
          <button type="button" className="btn" aria-pressed={inWl} onClick={() => d.toggleWatchlist(film)}>
            <Bookmark className="fillable" />
            Watchlist
          </button>
        ) : null}
        <button type="button" className="btn" aria-pressed={copies.length > 0} onClick={() => setCopy("new")} title={copies.length ? "Tu possèdes ce film : ajouter un autre exemplaire" : "Ajouter à ma collection"}>
          <Disc />
          {copies.length ? "En disque" : "Disque"}
        </button>
        <span className="rate">
          {rating ? "Ta note" : "Noter"}
          <Stars value={rating} onChange={(v) => d.markSeen(film, v)} />
        </span>
        <details
          className="more-menu"
          ref={more}
          onKeyDown={(e) => {
            if (e.key === "Escape" && more.current?.open) {
              e.stopPropagation();
              closeMore();
              more.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="btn icon" aria-label="Plus d'options" title="Plus d'options">
            <Dots />
          </summary>
          <div className="menu">
            <button
              type="button"
              onClick={() => {
                closeMore();
                setLogging(true);
              }}
            >
              Ajouter au journal, avec la date <Journal />
            </button>
            <button type="button" aria-pressed={isFav} onClick={() => (closeMore(), d.toggleFavorite(film))}>
              {isFav ? "Retirer des coups de cœur" : "Coup de cœur"} <Heart className="fillable" />
            </button>
            <button type="button" onClick={() => (closeMore(), setListing(true))}>
              Ajouter à une liste <List />
            </button>
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
                {wanted ? "Je ne le cherche plus" : "Je le cherche en disque"}
              </button>
            ) : null}
          </div>
        </details>
      </div>
      {inLists || copies.length ? (
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
