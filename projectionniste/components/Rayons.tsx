"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { frDate, plural, splitTitle } from "@/lib/format";
import { followedIn, markCompleted, mySets, setItems, type MySet, type SetItem } from "@/lib/sets";
import { useProfile } from "./ProfileProvider";
import { TitleDuo } from "./TitleDuo";

/** Au-delà, les places vides se résument en « + 82 manquants ». */
const SLOTS = 36;
const SHOWN = 3;

type Rayon = ReturnType<typeof followedIn>[number];

function RayonShelf({ r, owned, onOpen, lit }: { r: Rayon; owned: Set<number>; onOpen: (id: number) => void; lit: boolean }) {
  const have = r.films.filter((f) => owned.has(f.tmdb_id));
  const missing = r.films.filter((f) => !owned.has(f.tmdb_id));
  const done = have.length;
  const total = r.films.length;
  const room = Math.max(0, SLOTS - have.length);
  const shownMissing = missing.slice(0, room);
  const f = r.follow;
  const complete = total > 0 && done === total;
  return (
    <div className={`rayon${lit ? " lit" : ""}`} id={`rayon-${r.set.key}`}>
      <div className="rayon-head">
        <Link href={`/ensembles/${r.set.key}`} className="rayon-t">
          <TitleDuo title={r.set.title} />
        </Link>
        <span className="rayon-k">{r.set.subtitle}</span>
        <span className="rayon-n">
          {done} <i>/ {total}</i>
        </span>
      </div>
      <div className="rayon-shelf" role="list" aria-label={`${r.set.title} : ${done} possédés sur ${total}`}>
        {[...r.films].map((film) => {
          const mine = owned.has(film.tmdb_id);
          if (!mine && !shownMissing.includes(film)) return null;
          const title = film.films?.title ?? "Film";
          const [a, b] = splitTitle(title);
          const year = (film.release_date || film.films?.release_date || "").slice(0, 4);
          return mine ? (
            <button key={film.tmdb_id} type="button" role="listitem" className="rspine" title={`${title} (${year})`} onClick={() => onOpen(film.tmdb_id)}>
              <span className="t">
                <b>{a}</b>
                {b ? <span> {b}</span> : null}
              </span>
            </button>
          ) : (
            <Link key={film.tmdb_id} role="listitem" href={`/film/${film.tmdb_id}`} className="rspine ghost" title={`Il te manque ${title} (${year})`}>
              <span className="t">
                {a}
                {b ? ` ${b}` : ""}
              </span>
            </Link>
          );
        })}
        {missing.length > shownMissing.length ? (
          <Link href={`/ensembles/${r.set.key}`} className="rayon-more">
            + {missing.length - shownMissing.length} manquants
          </Link>
        ) : null}
      </div>
      {complete && f.completed_at ? (
        <p className="rayon-done">Complet · {frDate(f.completed_at.slice(0, 10), { month: "long", year: "numeric" })}</p>
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
  const { sb } = useProfile();
  const [sets, setSets] = useState<MySet[] | null>(null);
  const [items, setItemsState] = useState<SetItem[]>([]);
  const [all, setAll] = useState(false);

  useEffect(() => {
    if (!sb) return;
    let alive = true;
    (async () => {
      const s = (await mySets(sb)).filter((x) => x.follows.some((f) => f.mode === "own"));
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
            <RayonShelf key={r.set.id} r={r} owned={owned} onOpen={onOpen} lit={r.set.key === highlight} />
          ))}
          {ordered.length > SHOWN ? (
            <button type="button" className="link-btn" onClick={() => setAll((v) => !v)}>
              {all ? "Ne montrer que les trois premiers" : `Autres rayons (${ordered.length - SHOWN})`}
            </button>
          ) : null}
        </>
      ) : (
        <p className="note">
          Un rayon, c'est un ensemble que tu veux compléter : la filmographie d'un cinéaste, une saga, les Palmes d'or… Ses places vides te montrent ce qui manque. Choisis-en un dans le{" "}
          <Link className="link" href="/ensembles">
            catalogue
          </Link>{" "}
          ou depuis la fiche d'un réalisateur.
        </p>
      )}
    </section>
  );
}
