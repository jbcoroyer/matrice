"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { firstDoor, localDay, seeded, shuffle, type Door } from "@/lib/discover";
import { useAsync } from "@/lib/hooks";
import { store } from "@/lib/store";
import { img, tmdb } from "@/lib/tmdb";
import type { Movie, Paged } from "@/lib/types";
import { DoorCard, useDiscoverCtx } from "./Doors";
import { Check } from "./icons";
import { useProfile } from "./ProfileProvider";

const ONBOARD_KEY = "projo.v5.onboard";
const WALL = 18;

/**
 * Premier lancement : la valeur avant la saisie. On coche quelques films qu'on connaît, et Fillmography
 * montre aussitôt un chemin (le cinéaste le plus présent, ce qu'il en reste à voir).
 */
export function Onboarding() {
  const d = useProfile();
  const ctx = useDiscoverCtx();
  const [show, setShow] = useState<boolean | null>(null);
  const [door, setDoor] = useState<Door | null>(null);

  // décidé une seule fois, au chargement : le guide ne disparaît pas pendant qu'on coche
  useEffect(() => {
    if (d.status === "ready" && show === null) setShow(!store.get(ONBOARD_KEY, false) && d.seen.size < 5);
  }, [d.status, d.seen.size, show]);

  const films = useAsync(
    async () => {
      const pages = await Promise.all([1, 2].map((page) => tmdb<Paged<Movie>>("discover/movie", { sort_by: "vote_count.desc", "vote_count.gte": 5000, without_genres: "99,10770", page }).catch(() => null)));
      return [...new Map(pages.flatMap((p) => p?.results ?? []).filter((m) => m.poster_path).map((m) => [m.id, m])).values()];
    },
    [],
    show === true,
  );
  const wall = useMemo(() => shuffle(films.data ?? [], seeded(`${localDay()}|mur`)).slice(0, WALL), [films.data]);

  // un chemin dès qu'on a coché deux films
  const n = d.seen.size;
  useEffect(() => {
    if (!show || !ctx || n < 2) return;
    let alive = true;
    const t = setTimeout(() => firstDoor(ctx).then((x) => alive && setDoor(x), () => {}), 700);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, n]);

  if (!show) return null;
  return (
    <section className="onboard" aria-labelledby="onboard-title">
      <p className="label">Pour commencer</p>
      <h2 id="onboard-title">
        Marque ce que <span>tu connais</span>
      </h2>
      <p className="onboard-lede">Clique les films que tu as déjà vus. Fillmography te montre aussitôt par où continuer.</p>
      <div className="onboard-wall" role="group" aria-label="Films que tu connais">
        {films.data
          ? wall.map((m) => {
              const on = d.seen.has(m.id);
              return (
                <button key={m.id} type="button" className={`ow${on ? " on" : ""}`} aria-pressed={on} aria-label={`${m.title}${on ? ", vu" : ""}`} title={m.title} onClick={() => (on ? d.unmarkSeen(m) : d.markSeen(m))}>
                  <img src={img(m.poster_path, "w185")} alt="" loading="lazy" />
                  {on ? <Check className="ow-check" aria-hidden="true" /> : null}
                </button>
              );
            })
          : Array.from({ length: WALL }, (_, i) => <span key={i} className="ow sk" />)}
      </div>
      {door ? (
        <div className="onboard-door" aria-live="polite">
          <p className="label">Ton premier chemin</p>
          <DoorCard door={door} heading="h3" />
        </div>
      ) : n >= 1 ? (
        <p className="note onboard-hint" aria-live="polite">
          {n >= 2 ? "Je cherche un chemin…" : "Encore un ou deux films, et je te montre un chemin."}
        </p>
      ) : null}
      <div className="onboard-more">
        <Link className="btn" href="/parametres#import">
          Importer mon Letterboxd
        </Link>
        <Link className="link-btn quiet" href="/parcours">
          Voir les parcours
        </Link>
        <button
          type="button"
          className="link-btn quiet"
          onClick={() => {
            store.set(ONBOARD_KEY, true);
            setShow(false);
          }}
        >
          Masquer ce guide
        </button>
      </div>
    </section>
  );
}
