"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { truncate, yearOf } from "@/lib/format";
import { img } from "@/lib/tmdb";
import type { Ranked } from "@/lib/types";
import { Poster } from "./Poster";
import { ProviderIcons } from "./ProviderIcons";
import { useProfile } from "./ProfileProvider";

/** La une : les meilleures pistes du jour, en rotation lente. */
export function Hero({ films }: { films: Ranked[] }) {
  const { toggleWatchlist, watchlist } = useProfile();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [bg, setBg] = useState<string | null>(null);
  const m = films[i % films.length];

  useEffect(() => {
    if (films.length < 2 || paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setI((x) => (x + 1) % films.length), 9000);
    return () => clearTimeout(t);
  }, [i, paused, films.length]);

  useEffect(() => {
    setBg(null);
    if (!m?.backdrop_path) return;
    const url = img(m.backdrop_path, "w1280");
    const im = new Image();
    im.onload = () => setBg(url);
    im.src = url;
    // précharge l'affiche suivante
    const next = films[(i + 1) % films.length];
    if (next?.backdrop_path) new Image().src = img(next.backdrop_path, "w1280");
  }, [m, films, i]);

  if (!m) return null;
  const inWl = watchlist.has(m.id);
  return (
    <section
      className="hero"
      aria-roledescription="carrousel"
      aria-label="À la une"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className={`hero-bg${bg ? " on" : ""}`} style={bg ? { backgroundImage: `url(${bg})` } : undefined} />
      {films.length > 1 ? (
        <div className="hero-dots">
          {films.map((f, k) => (
            <button key={f.id} type="button" aria-label={`Afficher ${f.title}`} aria-current={k === i} onClick={() => setI(k)} />
          ))}
        </div>
      ) : null}
      <div className="poster-wrap" key={`p${m.id}`}>
        <Link href={`/film/${m.id}`} tabIndex={-1} aria-hidden="true">
          <Poster path={m.poster_path} title={m.title} size="w500" eager />
        </Link>
      </div>
      <div className="view" key={`t${m.id}`}>
        <div className="kicker">À la une · {i === 0 ? "Ta meilleure piste du jour" : `Piste n° ${i + 1}`}</div>
        <h1>
          <Link href={`/film/${m.id}`}>{m.title}</Link>
        </h1>
        <div className="orig">{[m.original_title && m.original_title !== m.title ? m.original_title : "", yearOf(m)].filter(Boolean).join(" · ")}</div>
        {m.overview ? <p className="standfirst">{truncate(m.overview, 320)}</p> : null}
        {m._because ? <p className="because">Parce que tu as aimé {m._because}.</p> : null}
        <div className="hero-actions">
          <Link className="btn primary" href={`/film/${m.id}`}>
            Lire la fiche
          </Link>
          <button type="button" className={`btn${inWl ? " on" : ""}`} onClick={() => toggleWatchlist(m)} aria-pressed={inWl}>
            {inWl ? "Dans ta watchlist" : "Ajouter à la watchlist"}
          </button>
          <ProviderIcons id={m.id} large />
        </div>
      </div>
    </section>
  );
}
