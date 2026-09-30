"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { frDate, plural, splitTitle } from "@/lib/format";
import { img } from "@/lib/tmdb";
import { followedIn, markCompleted, mySets, setItems, type MySet, type SetItem } from "@/lib/sets";
import { Eye } from "./icons";
import { useProfile } from "./ProfileProvider";
import { TitleDuo } from "./TitleDuo";

/** Au-delà, les places vides se résument en « + 82 manquants ». */
const SLOTS = 36;
const SHOWN = 3;

type Rayon = ReturnType<typeof followedIn>[number];

function RayonShelf({ r, owned, seen, onOpen, lit }: { r: Rayon; owned: Set<number>; seen: Set<number>; onOpen: (id: number) => void; lit: boolean }) {
  const missing = r.films.filter((f) => !owned.has(f.tmdb_id));
  const done = r.films.length - missing.length;
  const seenN = r.films.filter((f) => seen.has(f.tmdb_id)).length;
  const both = r.films.filter((f) => owned.has(f.tmdb_id) && seen.has(f.tmdb_id)).length;
  const total = r.films.length;
  const room = Math.max(0, SLOTS - done);
  const shownMissing = new Set(missing.slice(0, room).map((f) => f.tmdb_id));
  const f = r.follow;
  const complete = total > 0 && done === total;
  const firstSeen = r.films.find((x) => (seen.has(x.tmdb_id) || owned.has(x.tmdb_id)) && x.films?.poster_path);
  const legendPoster = firstSeen ? ({ "--p": `url(${img(firstSeen.films!.poster_path!, "w92")})` } as React.CSSProperties) : undefined;
  return (
    <div className={`rayon${lit ? " lit" : ""}`} id={`rayon-${r.set.key}`}>
      <div className="rayon-head">
        <Link href={`/ensembles/${r.set.key}`} className="rayon-t">
          <TitleDuo title={r.set.title} />
        </Link>
        <span className="rayon-k">{r.set.subtitle}</span>
        <span className="rayon-nums">
          <span className="rayon-n" title="Possédés">
            {done} <i>/ {total}</i>
          </span>
          <span className="rayon-sub">
            {done > 1 ? "possédés" : "possédé"} · <Eye aria-hidden="true" /> {seenN} vu{seenN > 1 ? "s" : ""}
            {both && both < total ? ` · ${both} vu${both > 1 ? "s" : ""} et possédé${both > 1 ? "s" : ""}` : ""}
          </span>
        </span>
      </div>
      <div className="rayon-shelf" role="list" aria-label={`${r.set.title} : ${done} possédés et ${seenN} vus sur ${total}`}>
        {r.films.map((film) => {
          const mine = owned.has(film.tmdb_id);
          if (!mine && !shownMissing.has(film.tmdb_id)) return null;
          const isSeen = seen.has(film.tmdb_id);
          const title = film.films?.title ?? "Film";
          const [a, b] = splitTitle(title);
          const year = (film.release_date || film.films?.release_date || "").slice(0, 4);
          const state = `${mine ? "possédé" : "à trouver"}, ${isSeen ? "vu" : "pas encore vu"}`;
          // la couleur de l'affiche monte dans le boîtier : à moitié si vu OU possédé, en entier si vu ET possédé
          const fill = mine || isSeen ? (mine && isSeen ? " fill full" : " fill half") : "";
          const poster = (mine || isSeen) && film.films?.poster_path ? ({ "--p": `url(${img(film.films.poster_path, "w185")})` } as React.CSSProperties) : undefined;
          const inner = (
            <>
              <span className="t">
                {mine ? <b>{a}</b> : a}
                {b ? (mine ? <span> {b}</span> : ` ${b}`) : null}
              </span>
              {isSeen ? <Eye className="rs-eye" aria-hidden="true" /> : null}
            </>
          );
          return mine ? (
            <button key={film.tmdb_id} type="button" role="listitem" className={`rspine${isSeen ? " seen" : ""}${fill}`} style={poster} title={`${title} (${year}) · ${state}`} aria-label={`${title}, ${state}`} onClick={() => onOpen(film.tmdb_id)}>
              {inner}
            </button>
          ) : (
            <Link key={film.tmdb_id} role="listitem" href={`/film/${film.tmdb_id}`} className={`rspine ghost${isSeen ? " seen" : ""}${fill}`} style={poster} title={`${title} (${year}) · ${state}`} aria-label={`${title}, ${state}`}>
              {inner}
            </Link>
          );
        })}
        {missing.length > shownMissing.size ? (
          <Link href={`/ensembles/${r.set.key}`} className="rayon-more">
            + {missing.length - shownMissing.size} à trouver
          </Link>
        ) : null}
      </div>
      <p className="rayon-legend" aria-hidden="true">
        <i className="lg-ghost" /> à trouver <i className="lg-own" style={legendPoster} /> possédé <i className="lg-seen" style={legendPoster} /> vu <i className="lg-both" style={legendPoster} /> vu et possédé
      </p>
      {complete && f.completed_at ? (
        <p className="rayon-done">
          Complet · {frDate(f.completed_at.slice(0, 10), { month: "long", year: "numeric" })}
          {both === total ? " · tout vu" : ` · ${plural(total - both, "reste", "restent")} à voir`}
        </p>
      ) : f.completed_at && done < total ? (
        <p className="rayon-done soft">
          Complet en {f.completed_at.slice(0, 4)} · {plural(total - (f.completed_count ?? done), "nouveau film", "nouveaux films")} depuis
        </p>
      ) : null}
    </div>
  );
}

/** Les rayons de la collection : les ensembles qu'on a choisi de compléter, avec leurs places vides. */
export function Rayons({ owned, onOpen, highlight }: { owned: Set<number>; onOpen: (id: number) => void; highlight: string | null }) {
  const { sb, seen } = useProfile();
  const [sets, setSets] = useState<MySet[] | null>(null);
  const [items, setItemsState] = useState<SetItem[]>([]);
  const [all, setAll] = useState(false);

  useEffect(() => {
    if (!sb) return;
    let alive = true;
    (async () => {
      const s = (await mySets(sb)).filter((x) => x.follows.length);
      const it = await setItems(sb, s.map((x) => x.id));
      if (alive) {
        setSets(s);
        setItemsState(it);
      }
    })().catch(() => alive && setSets([]));
    return () => {
      alive = false;
    };
  }, [sb]);

  const rayons = useMemo(() => (sets ? followedIn(sets, items, "own") : []), [sets, items]);
  // cycles pas (encore) ouverts en rayon : on les montre, pour pouvoir aussi les posséder
  const cyclesOnly = useMemo(() => (sets ?? []).filter((s) => !s.follows.some((f) => f.mode === "own")), [sets]);

  // complétion : notée une seule fois
  useEffect(() => {
    if (!sb) return;
    for (const r of rayons) {
      const done = r.films.filter((f) => owned.has(f.tmdb_id)).length;
      if (!r.follow.completed_at && r.films.length && done === r.films.length) markCompleted(sb, r.set.id, "own", done).catch(() => {});
    }
  }, [sb, rayons, owned]);

  // ?rayon=… : le rayon demandé passe devant et on s'y rend
  const ordered = useMemo(() => (highlight ? [...rayons.filter((r) => r.set.key === highlight), ...rayons.filter((r) => r.set.key !== highlight)] : rayons), [rayons, highlight]);
  useEffect(() => {
    if (highlight && ordered.length) document.getElementById(`rayon-${highlight}`)?.scrollIntoView({ block: "center" });
  }, [highlight, ordered.length]);

  if (!sets) return null;
  const shown = all ? ordered : ordered.slice(0, SHOWN);
  return (
    <section className="rayons" aria-labelledby="rayons-title">
      <div className="rayons-head">
        <h2 id="rayons-title" className="label">
          Tes rayons
        </h2>
        <Link href="/ensembles" className="link-btn quiet">
          Ouvrir un rayon ›
        </Link>
      </div>
      {rayons.length ? (
        <>
          {shown.map((r) => (
            <RayonShelf key={r.set.id} r={r} owned={owned} seen={seen} onOpen={onOpen} lit={r.set.key === highlight} />
          ))}
          {ordered.length > SHOWN ? (
            <button type="button" className="link-btn" onClick={() => setAll((v) => !v)}>
              {all ? "Ne montrer que les trois premiers" : `Autres rayons (${ordered.length - SHOWN})`}
            </button>
          ) : null}
        </>
      ) : cyclesOnly.length ? null : (
        <p className="note">
          Un rayon, c'est un ensemble que tu veux compléter : la filmographie d'un cinéaste, une saga, les Palmes d'or… Ses places vides te montrent ce qui manque. Choisis-en un dans le{" "}
          <Link className="link" href="/ensembles">
            catalogue
          </Link>{" "}
          ou depuis la fiche d'un réalisateur.
        </p>
      )}
      {cyclesOnly.length ? (
        <p className="rayons-cycles">
          {cyclesOnly.length > 1 ? "Tes cycles" : "Ton cycle"} en cours, à posséder aussi ?{" "}
          {cyclesOnly.map((c, i) => (
            <span key={c.id}>
              {i ? " · " : ""}
              <Link href={`/ensembles/${c.key}`}>{c.title}</Link>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}
