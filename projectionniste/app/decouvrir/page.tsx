"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Plus } from "@/components/icons";
import { useProfile } from "@/components/ProfileProvider";
import { Rail } from "@/components/Rail";
import { TitleDuo } from "@/components/TitleDuo";
import { MoodChips } from "@/components/MoodChips";
import { EDITORIAL } from "@/lib/editorial";
import { Onboarding } from "@/components/ui";
import { num1, runtime, truncate, yearOf } from "@/lib/format";
import { GENRE_FR } from "@/lib/genres";
import { useAsync } from "@/lib/hooks";
import { img, tmdb } from "@/lib/tmdb";
import type { Credits, Movie, MovieDetail, Paged, Ranked } from "@/lib/types";

const FEATURED = 5;

function greeting() {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
}

/** À la une : les films les plus regardés cette semaine, en carrousel ; fond d'ambiance tiré de l'affiche active. */
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
  const Heading = d.empty ? "h2" : "h1";
  const pos = (k: number) => {
    const n = list.length;
    let p = (k - i + n) % n;
    if (p > n / 2) p -= n;
    return p >= -1 && p <= 2 ? String(p) : "hidden";
  };

  return (
    <section className="d-hero" aria-label="À la une cette semaine">
      <div className="ambient">{m.poster_path ? <img key={m.id} src={img(m.poster_path, "w342")} alt="" /> : null}</div>
      <div className="wrap d-in">
        <div className="d-text">
          <p className="hello">
            {greeting()} {first ? <b>{first}</b> : null} — {i === 0 ? "voici ce que tout le monde regarde cette semaine" : `et aussi (${i + 1}/${list.length})`}
          </p>
          {/* le guide de démarrage porte le titre de la page pour un compte neuf */}
          <Heading className="d-title">
            <Link href={`/film/${m.id}`}>
              <TitleDuo title={m.title} />
            </Link>
          </Heading>
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
            {m.vote_average ? <span className="chip">TMDB {num1(m.vote_average)}</span> : null}
          </div>
          {m.overview ? <p className="d-why">{truncate(m.overview, 220)}</p> : null}
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

/** Une rangée de films TMDB (page 1 et 2), sans tri ni filtre personnel. */
function useMovies(path: string, params: Record<string, string | number> = {}) {
  return useAsync<Ranked[]>(async () => {
    const pages = await Promise.all([1, 2].map((page) => tmdb<Paged<Movie>>(path, { ...params, page })));
    const have = new Set<number>();
    return pages
      .flatMap((p) => p.results)
      .filter((m) => m.poster_path && !have.has(m.id) && (have.add(m.id), true))
      .slice(0, 24);
  }, [path]);
}

const rail = (a: { data?: Ranked[]; error: unknown }) => ({ list: a.data ?? (a.error ? [] : undefined), loading: !a.data && !a.error });

export default function Decouvrir() {
  const trending = useMovies("trending/movie/week");
  const playing = useMovies("movie/now_playing", { region: "FR" });
  const upcoming = useMovies("movie/upcoming", { region: "FR" });
  const top = useMovies("movie/top_rated");
  const featured = (trending.data ?? []).slice(0, FEATURED);

  return (
    <>
      <Onboarding />
      {featured.length ? <Featured list={featured} /> : null}
      <MoodChips />
      <Rail title="À l'affiche en France" sub="Ce qui est en salles en ce moment" href="/decouvrir/populaires?liste=now_playing" {...rail(playing)} />
      <Rail title="Tendances de la semaine" sub="Ce que tout le monde regarde" href="/decouvrir/populaires" {...rail(trending)} list={trending.data ? trending.data.slice(FEATURED) : rail(trending).list} />
      <section className="dsets" aria-labelledby="dsets-title">
        <div className="rail-head">
          <div>
            <h2 id="dsets-title">
              <Link href="/ensembles">
                Rayons <span>et cycles</span>
              </Link>
            </h2>
            <p>Des ensembles à voir ou à collectionner, les mêmes pour tout le monde</p>
          </div>
          <div className="rail-tools">
            <Link href="/ensembles">Tout le catalogue →</Link>
          </div>
        </div>
        <ul>
          {EDITORIAL.slice(0, 7).map((e) => (
            <li key={e.key}>
              <Link href={`/ensembles/${e.key}`}>
                <span className="dsets-k">{e.kicker}</span>
                <TitleDuo title={e.title} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Rail title="Bientôt en salles" sub="Les prochaines sorties" href="/decouvrir/populaires?liste=upcoming" {...rail(upcoming)} />
      <Rail title="Les mieux notés" sub="Les grands films, tous pays et toutes époques" href="/decouvrir/populaires?liste=top_rated" {...rail(top)} />
    </>
  );
}
