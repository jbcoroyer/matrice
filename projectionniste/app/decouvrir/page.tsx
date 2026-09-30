"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "@/components/icons";
import { useProfile } from "@/components/ProfileProvider";
import { Rail } from "@/components/Rail";
import { TitleDuo } from "@/components/TitleDuo";
import { Onboarding } from "@/components/ui";
import { num1, runtime, truncate, yearOf } from "@/lib/format";
import { GENRE_FR } from "@/lib/genres";
import { useAsync, useRecs } from "@/lib/hooks";
import { img, tmdb } from "@/lib/tmdb";
import type { Credits, Movie, MovieDetail, Paged, Ranked } from "@/lib/types";

const FEATURED = 5;

function greeting() {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
}

/** La sélection du jour : carrousel d'affiches, fond d'ambiance tiré de l'affiche active. */
function Featured({ list }: { list: Ranked[] }) {
  const d = useProfile();
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);
  const m = list[Math.min(i, list.length - 1)];
  const det = useAsync<(MovieDetail & { credits: Credits }) | null>(
    () => tmdb<MovieDetail & { credits: Credits }>(`movie/${m.id}`, { append_to_response: "credits" }).catch(() => null),
    [m.id],
  );
  const go = (n: number) => setI((n + list.length) % list.length);
  useEffect(() => {
    if (i >= list.length) setI(0);
  }, [list.length, i]);

  const info = det.data?.id === m.id ? det.data : null;
  const dirs = info?.credits?.crew.filter((c) => c.job === "Director").slice(0, 2) ?? [];
  const genres = (info?.genres?.map((g) => g.id) ?? m.genre_ids ?? []).slice(0, 2).map((g) => GENRE_FR[g]).filter(Boolean);
  const inWl = d.watchlist.has(m.id);
  const first = d.profile?.owner?.split(" ")[0];
  const pos = (k: number) => {
    const n = list.length;
    let p = (k - i + n) % n;
    if (p > n / 2) p -= n;
    return p >= -1 && p <= 2 ? String(p) : "hidden";
  };

  return (
    <section className="d-hero" aria-label="Ta sélection du jour">
      <div className="ambient">{m.poster_path ? <img key={m.id} src={img(m.poster_path, "w342")} alt="" /> : null}</div>
      <div className="wrap d-in">
        <div className="d-text">
          <p className="hello">
            {greeting()} {first ? <b>{first}</b> : null} — {i === 0 ? "voici ta sélection du jour" : `et aussi, pour toi (${i + 1}/${list.length})`}
          </p>
          <h1 className="d-title">
            <Link href={`/film/${m.id}`}>
              <TitleDuo title={m.title} />
            </Link>
          </h1>
          <div className="meta-line label">
            {[
              ...genres,
              yearOf(m),
              info?.runtime ? runtime(info.runtime) : "",
            ]
              .filter(Boolean)
              .map((x, k) => (
                <span key={k} style={{ display: "contents" }}>
                  {k ? <i className="sep" /> : null}
                  <span>{x}</span>
                </span>
              ))}
            {dirs.length ? (
              <>
                <i className="sep" />
                {dirs.map((p) => (
                  <Link key={p.id} href={`/personne/${p.id}`}>
                    {p.name}
                  </Link>
                ))}
              </>
            ) : null}
          </div>
          <div className="d-scores">
            {m._pred ? (
              <span className="pill guess" title="La note que tu devrais lui donner, d'après tes goûts" aria-label={`Ton indice : ${num1(m._pred)}, estimé d'après tes goûts`}>
                {num1(m._pred)} · ton indice
              </span>
            ) : null}
            {m.vote_average ? <span className="chip">TMDB {num1(m.vote_average)}</span> : null}
          </div>
          {m.overview ? <p className="d-why">{truncate(m.overview, 220)}</p> : null}
          {m._because ? (
            <p className="d-why" style={{ marginTop: 10, fontSize: 14.5 }}>
              Parce que tu as aimé <b>{m._because}</b>
            </p>
          ) : null}
          <div className="d-actions">
            <button type="button" className={inWl ? "btn" : "btn primary"} aria-pressed={inWl} onClick={() => d.toggleWatchlist(m)}>
              {inWl ? <Check /> : <Plus />}
              {inWl ? "Dans ta watchlist" : "Ajouter à ma watchlist"}
            </button>
            <Link className="btn" href={`/film/${m.id}`}>
              Voir la fiche
            </Link>
          </div>
          <div className="dots" role="group" aria-label="Sélection">
            {list.map((f, k) => (
              <button key={f.id} type="button" aria-current={k === i} aria-label={`${k + 1} sur ${list.length} : ${f.title}`} onClick={() => setI(k)} />
            ))}
          </div>
        </div>
        <div
          className="carousel"
          tabIndex={0}
          aria-label="Affiches de la sélection (flèches gauche et droite)"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(i + 1);
            if (e.key === "ArrowLeft") go(i - 1);
          }}
          onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touch.current == null) return;
            const dx = e.changedTouches[0].clientX - touch.current;
            if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
            touch.current = null;
          }}
        >
          {list.map((f, k) => {
            const p = pos(k);
            return (
              <button key={f.id} type="button" className="c" data-pos={p} tabIndex={-1} aria-hidden={p !== "0"} onClick={() => (p === "0" ? null : setI(k))}>
                {f.poster_path ? <img src={img(f.poster_path, p === "0" ? "w500" : "w342")} alt={p === "0" ? `Affiche de ${f.title}` : ""} /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Decouvrir() {
  const d = useProfile();
  const recs = useRecs();
  const withPoster = (recs.data ?? []).filter((m) => m.poster_path && !d.seen.has(m.id));
  const featured = withPoster.slice(0, FEATURED);
  const trending = useAsync<Ranked[]>(
    async () => {
      const ps = await Promise.all([1, 2].map((page) => tmdb<Paged<Movie>>("trending/movie/week", { page })));
      // les pages de tendances peuvent se recouper : un film n'apparaît qu'une fois
      const have = new Set<number>();
      return ps
        .flatMap((p) => p.results)
        .filter((m) => m.poster_path && !have.has(m.id) && (have.add(m.id), true))
        .map((m) => ({ ...m, _pred: d.predict(m).v }))
        .slice(0, 24);
    },
    [d.profile],
  );

  return (
    <>
      <Onboarding />
      {featured.length && !d.empty ? <Featured list={featured} /> : null}
      {d.empty ? null : <Rail
        title="Pour toi"
        sub={d.rated.size ? "D'après les films que tu as le mieux notés" : "Note quelques films pour affiner la sélection"}
        href="/decouvrir/pour-toi"
        list={recs.data ? withPoster.slice(FEATURED, FEATURED + 24) : undefined}
        loading={!recs.data && !recs.error}
        empty={
          <>
            Rien à proposer pour l'instant. <Link href="/parametres#import">Importe ton Letterboxd</Link> ou note quelques films.
          </>
        }
      />}
      <Rail title="Tendances de la semaine" sub={d.empty ? "Ce que tout le monde regarde cette semaine" : "Ce que tout le monde regarde, avec ton indice"} href="/decouvrir/populaires" list={trending.data} loading={!trending.data} />
    </>
  );
}
