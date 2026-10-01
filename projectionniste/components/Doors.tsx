"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Door } from "@/lib/discover";
import { buildDoors, filmDoors, type Ctx } from "@/lib/discover";
import { loadSeenFilms } from "@/lib/db";
import { img } from "@/lib/tmdb";
import { useProfile } from "./ProfileProvider";
import { TitleDuo } from "./TitleDuo";

/** Ce que Découvrir sait de l'utilisateur connecté (null tant que le profil n'est pas chargé). */
export function useDiscoverCtx(): Ctx | null {
  const d = useProfile();
  return useMemo(
    () => (d.status === "ready" && d.sb && d.userId ? { sb: d.sb, userId: d.userId, seen: d.seen, rated: d.rated, watchlist: d.watchlist, owned: d.owned, titles: d.titles } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d.status, d.sb, d.userId, d.seen.size, d.rated.size, d.watchlist.size, d.owned.size],
  );
}

/** Une porte : une image, ce qu'elle ouvre (un cinéaste, un mouvement, une saga), pourquoi, et par quel film entrer. */
export function DoorCard({ door, heading = "h3" }: { door: Door; heading?: "h2" | "h3" }) {
  const H = heading;
  return (
    <Link href={door.href} className={`door door-${door.kind}`}>
      <span className="door-still" aria-hidden="true">
        {door.still ? <img src={img(door.still, "w780")} alt="" loading="lazy" /> : null}
      </span>
      <span className="door-text">
        <span className="label door-k">{door.kicker}</span>
        <H className="door-t">
          <TitleDuo title={door.title} />
        </H>
        <span className="door-why">{door.why}</span>
        {door.next ? (
          <span className="door-next">
            {door.nextLabel} : <b>{door.next.title}</b>
            {door.next.year ? ` · ${door.next.year}` : ""}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

function DoorsSkeleton() {
  return (
    <div className="paths" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="door">
          <span className="door-still sk" />
          <span className="door-text">
            <span className="sk sk-line w40" />
            <span className="sk sk-line w80" />
          </span>
        </div>
      ))}
    </div>
  );
}

/** « Trois chemins » : un cinéaste, une sélection proche, un écart ; ou trois portes d'entrée pour un compte qui débute. */
export function Paths({ enabled, avoidDirector }: { enabled: boolean; avoidDirector: number | null }) {
  const ctx = useDiscoverCtx();
  const [doors, setDoors] = useState<Door[] | null>(null);
  const known = (ctx?.seen.size ?? 0) >= 5;

  useEffect(() => {
    if (!ctx || !enabled) return;
    let alive = true;
    (async () => {
      const seenFilms = known ? await loadSeenFilms(ctx.sb).catch(() => []) : [];
      return buildDoors(ctx, seenFilms, avoidDirector);
    })().then(
      (l) => alive && setDoors(l),
      () => alive && setDoors([]),
    );
    return () => {
      alive = false;
    };
  }, [ctx, enabled, avoidDirector, known]);

  if (doors && !doors.length) return null;
  return (
    <section className="section paths-sec" aria-labelledby="paths-title">
      <div className="sec-head">
        <h2 id="paths-title">{known ? <>Trois <span>chemins</span></> : <>Des portes <span>d'entrée</span></>}</h2>
        <span className="aside">
          {known ? "À partir de ce que tu regardes" : "Pour commencer quelque part"} · <Link href="/ensembles">Tout le catalogue →</Link>
        </span>
      </div>
      {doors ? (
        <div className="paths">
          {doors.map((x) => (
            <DoorCard key={x.key} door={x} />
          ))}
        </div>
      ) : (
        <DoorsSkeleton />
      )}
    </section>
  );
}

/** Sur une fiche film : le cinéaste, la saga, les sélections dont le film fait partie. */
export function FilmDoors({ id, directors, saga }: { id: number; directors: { id: number; name: string }[]; saga: { id: number; name: string } | null }) {
  const d = useProfile();
  const [doors, setDoors] = useState<Door[] | null>(null);
  const signedIn = d.status === "ready";
  useEffect(() => {
    if (d.status === "loading") return;
    let alive = true;
    filmDoors({ id, directors, saga }, d.seen, signedIn).then(
      (l) => alive && setDoors(l),
      () => alive && setDoors([]),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, d.status, d.seen.size]);
  if (!doors?.length) return null;
  return (
    <section className="section film-doors" aria-labelledby="film-doors-title">
      <h2 className="block-title" id="film-doors-title">
        Où aller <span>ensuite</span>
      </h2>
      <div className="paths">
        {doors.map((x) => (
          <DoorCard key={x.key} door={x} />
        ))}
      </div>
    </section>
  );
}
