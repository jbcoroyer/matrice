"use client";

import Link from "next/link";
import { FilmGrid } from "@/components/FilmGrid";
import { useProfile } from "@/components/ProfileProvider";
import { EmptyInvite, ErrorLine, ProfileGate, SecHead, SkeletonGrid } from "@/components/ui";
import { useAsync, useRecs, useWatchlistMovies } from "@/lib/hooks";
import { MOODS } from "@/lib/moods";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href}>{children}</Link>;
}

function Accueil() {
  const d = useProfile();
  const recs = useRecs();
  const salles = useAsync<Ranked[]>(
    async () => {
      const r = await tmdb<Paged<Movie>>("movie/now_playing", { region: "FR", page: 1 });
      return r.results
        .filter((m) => m.poster_path && !d.seen.has(m.id))
        .map((m) => ({ ...m, _pred: d.predict(m).v }))
        .sort((a, b) => b._pred - a._pred)
        .slice(0, 6);
    },
    [d.profile],
  );
  const wl = useWatchlistMovies();

  return (
    <>
      <EmptyInvite />
      <section className="section">
        <SecHead title="Pour toi" aside={<More href="/pour-toi">Tout voir →</More>} />
        {recs.error ? (
          <ErrorLine error={recs.error} onRetry={recs.reload} />
        ) : recs.data ? (
          recs.data.length ? (
            <FilmGrid list={recs.data.slice(0, 12)} step={12} />
          ) : (
            <p className="status">
              Pas assez de films notés pour proposer quoi que ce soit. <Link className="link" href="/reglages">Importer mon Letterboxd</Link>
            </p>
          )
        ) : (
          <SkeletonGrid n={12} />
        )}
      </section>

      <section className="section">
        <SecHead title="En salles" aside={<More href="/salles">Tout le programme →</More>} />
        {salles.error ? <ErrorLine error={salles.error} onRetry={salles.reload} /> : salles.data ? <FilmGrid list={salles.data} step={6} /> : <SkeletonGrid n={6} />}
      </section>

      <section className="section">
        <SecHead title="Watchlist" aside={<More href="/watchlist">Tout voir →</More>} />
        {wl.error ? (
          <ErrorLine error={wl.error} onRetry={wl.reload} />
        ) : wl.data ? (
          wl.data.length ? (
            <FilmGrid list={wl.data.slice(0, 6)} step={6} />
          ) : (
            <p className="status">Ta watchlist est vide. Le bouton + sur une affiche y ajoute un film.</p>
          )
        ) : (
          <SkeletonGrid n={6} />
        )}
      </section>

      <section className="section">
        <SecHead title="Humeurs" aside={<More href="/humeurs">Toutes →</More>} />
        <div className="moods">
          {MOODS.slice(0, 6).map((m) => (
            <Link key={m.slug} className="mood" href={`/humeurs/${m.slug}`}>
              <h3>{m.t}</h3>
              <p>{m.s}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Page() {
  return (
    <ProfileGate>
      <Accueil />
    </ProfileGate>
  );
}
