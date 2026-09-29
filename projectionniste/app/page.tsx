"use client";

import Link from "next/link";
import { FilmGrid } from "@/components/FilmGrid";
import { Hero } from "@/components/Hero";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, ProfileGate, SecHead, SkeletonGrid } from "@/components/ui";
import { useAsync, useRecs, useWatchlistMovies } from "@/lib/hooks";
import { MOODS } from "@/lib/moods";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="link-btn" href={href}>
      {children}
    </Link>
  );
}

function Une() {
  const d = useProfile();
  const recs = useRecs();
  const salles = useAsync<Ranked[]>(
    async () => {
      const r = await tmdb<Paged<Movie>>("movie/now_playing", { region: "FR", page: 1 });
      return r.results
        .filter((m) => m.poster_path && !d.seen.has(m.id))
        .map((m) => ({ ...m, _pred: d.predict(m).v }))
        .sort((a, b) => b._pred - a._pred)
        .slice(0, 5);
    },
    [d.profile],
  );
  const wl = useWatchlistMovies();

  const list = recs.data ?? [];
  const strong = list.slice(0, 30).filter((m) => m.backdrop_path && (m.vote_count || 0) >= 1500);
  const heroes = (strong.length ? strong : list.filter((m) => m.backdrop_path)).slice(0, 5);
  const heroSet = new Set(heroes.map((m) => m.id));

  return (
    <>
      {recs.loading && !recs.data ? <div className="hero sk" style={{ minHeight: 420 }} aria-hidden="true" /> : heroes.length ? <Hero films={heroes} /> : null}

      <section className="section">
        <SecHead kicker="Sélection personnelle" title={<>Pour toi, <i>cette semaine</i></>} aside={<More href="/pour-toi">Toute la sélection</More>} />
        {recs.error ? (
          <ErrorLine error={recs.error} onRetry={recs.reload} />
        ) : recs.data ? (
          list.length ? (
            <FilmGrid list={list.filter((m) => !heroSet.has(m.id)).slice(0, 10)} lead step={10} />
          ) : (
            <p className="status">
              La sélection est vide : il faut quelques films bien notés pour la composer. <Link className="link-btn" href="/reglages">Importer mon Letterboxd</Link>
            </p>
          )
        ) : (
          <SkeletonGrid n={10} lead />
        )}
      </section>

      <section className="section">
        <SecHead kicker="À l'affiche" title={<>En salles <i>en France</i></>} aside={<More href="/salles">Tout le programme</More>} />
        {salles.error ? <ErrorLine error={salles.error} onRetry={salles.reload} /> : salles.data ? <FilmGrid list={salles.data} step={5} /> : <SkeletonGrid n={5} />}
      </section>

      <section className="section">
        <SecHead kicker="Selon l'envie" title={<>Humeurs <i>du soir</i></>} aside={<More href="/humeurs">Toutes les humeurs</More>} />
        <div className="moods">
          {MOODS.slice(0, 4).map((m) => (
            <Link key={m.slug} className="mood" href={`/humeurs/${m.slug}`}>
              <div className="kicker">{m.k}</div>
              <h3>{m.t}</h3>
              <p>{m.s}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <SecHead kicker="Ta liste" title={<>Watchlist, <i>à rattraper</i></>} aside={<More href="/watchlist">Toute la watchlist</More>} />
        {wl.error ? (
          <ErrorLine error={wl.error} onRetry={wl.reload} />
        ) : wl.data ? (
          wl.data.length ? (
            <FilmGrid list={wl.data.slice(0, 5)} step={5} />
          ) : (
            <p className="status">Ta watchlist est vide. Ajoute des films avec le bouton ＋ des affiches.</p>
          )
        ) : (
          <SkeletonGrid n={5} />
        )}
      </section>
    </>
  );
}

export default function Page() {
  return (
    <div className="view">
      <ProfileGate>
        <Une />
      </ProfileGate>
    </div>
  );
}
