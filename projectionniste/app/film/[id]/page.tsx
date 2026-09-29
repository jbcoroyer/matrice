import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Poster } from "@/components/Poster";
import { FilmRecs, ScoreBox, Trailer, WhereToWatch } from "@/components/FilmPersonal";
import { FilmHistory, FilmPanel } from "@/components/FilmPanel";
import { SeenBadge } from "@/components/SeenBadge";
import { SecHead } from "@/components/ui";
import { GENRE_FR } from "@/lib/genres";
import { runtime, truncate, yearOf } from "@/lib/format";
import { img } from "@/lib/tmdb";
import { tmdbFetch, TmdbError } from "@/lib/tmdb-server";
import type { Movie, MovieDetail } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

const getFilm = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  try {
    return await tmdbFetch<MovieDetail>(`movie/${id}`, {
      append_to_response: "credits,videos,recommendations,similar,external_ids,release_dates,watch/providers",
      include_video_language: "fr,en,null",
    });
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const m = await getFilm(id).catch(() => null);
  if (!m) return { title: "Film introuvable" };
  const title = `${m.title}${yearOf(m) ? ` (${yearOf(m)})` : ""}`;
  const description = m.overview ? truncate(m.overview, 200) : undefined;
  const image = m.backdrop_path ? img(m.backdrop_path, "w1280") : m.poster_path ? img(m.poster_path, "w500") : undefined;
  return { title, description, openGraph: { title, description, images: image ? [image] : undefined, type: "video.movie" } };
}

export default async function FilmPage({ params }: Props) {
  const { id } = await params;
  const m = await getFilm(id);
  if (!m) notFound();

  const crew = m.credits?.crew ?? [];
  const cast = m.credits?.cast ?? [];
  const dirs = crew.filter((x) => x.job === "Director");
  const writers = [...new Map(crew.filter((x) => ["Screenplay", "Writer", "Novel", "Story"].includes(x.job)).map((x) => [x.id, x])).values()].slice(0, 3);
  const dop = crew.find((x) => x.job === "Director of Photography");
  const music = crew.find((x) => x.job === "Original Music Composer");
  const editor = crew.find((x) => x.job === "Editor");
  const vids = (m.videos?.results ?? []).filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
  const trailer = vids.find((v) => v.type === "Trailer" && v.iso_639_1 === "fr") || vids.find((v) => v.type === "Trailer") || vids[0];
  const cert = m.release_dates?.results.find((r) => r.iso_3166_1 === "FR")?.release_dates.map((d) => d.certification).find(Boolean);
  const frRelease = m.release_dates?.results.find((r) => r.iso_3166_1 === "FR")?.release_dates.find((d) => d.type === 3)?.release_date;
  const imdb = m.external_ids?.imdb_id;
  const fr = m["watch/providers"]?.results?.FR ?? null;

  const seenIds = new Set<number>([m.id]);
  const recs: Movie[] = [];
  for (const r of [...(m.recommendations?.results ?? []), ...(m.similar?.results ?? [])])
    if (r.poster_path && !seenIds.has(r.id)) {
      seenIds.add(r.id);
      recs.push(r);
    }

  const person = (p: { id: number; name: string }) => (
    <Link key={p.id} href={`/personne/${p.id}`}>
      {p.name}
    </Link>
  );
  const join = (arr: React.ReactNode[]) => arr.flatMap((x, i) => (i ? [", ", x] : [x]));
  const film = {
    id: m.id,
    title: m.title,
    original_title: m.original_title,
    release_date: m.release_date,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    genre_ids: (m.genres ?? []).map((g) => g.id),
    runtime: m.runtime,
  };
  const scoreMovie: Movie = { id: m.id, title: m.title, genres: m.genres, vote_average: m.vote_average, vote_count: m.vote_count };

  return (
    <article className="film">
      <div>
        <div className="film-grid">
          <div className="poster-wrap">
            <Poster path={m.poster_path} title={m.title} size="w500" eager>
              <SeenBadge id={m.id} />
            </Poster>
            <FilmPanel film={film} />
          </div>
          <div>
            <h1>{m.title}</h1>
            {m.original_title && m.original_title !== m.title ? <div className="orig">{m.original_title}</div> : null}
            <div className="facts">
              {[
                yearOf(m),
                runtime(m.runtime),
                (m.genres ?? []).map((g) => GENRE_FR[g.id] || g.name).join(", "),
                cert ? `Visa ${cert}` : "",
                (m.production_countries ?? []).map((c) => c.iso_3166_1).join(" / "),
                frRelease && frRelease.slice(0, 10) > new Date().toISOString().slice(0, 10)
                  ? `sortie en France le ${new Date(frRelease).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
            {m.tagline ? <p className="tagline-f">« {m.tagline} »</p> : null}
            <ScoreBox movie={scoreMovie} credits={{ cast: cast.slice(0, 5), crew: dirs }} />
            {m.overview ? <p className="overview">{m.overview}</p> : <p className="note">Pas encore de résumé en français.</p>}
            <FilmHistory film={film} />
            <div className="credits">
              {dirs.length ? (
                <div>
                  <small>Réalisation</small>
                  {join(dirs.map(person))}
                </div>
              ) : null}
              {writers.length ? (
                <div>
                  <small>Scénario</small>
                  {join(writers.map(person))}
                </div>
              ) : null}
              {dop ? (
                <div>
                  <small>Image</small>
                  {person(dop)}
                </div>
              ) : null}
              {editor ? (
                <div>
                  <small>Montage</small>
                  {person(editor)}
                </div>
              ) : null}
              {music ? (
                <div>
                  <small>Musique</small>
                  {person(music)}
                </div>
              ) : null}
            </div>
            <WhereToWatch fr={fr} />
          </div>
        </div>

        {trailer ? (
          <section className="section">
            <SecHead
              title="Bande-annonce"
              aside={
                <a className="link" href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noopener">
                  Ouvrir sur YouTube
                </a>
              }
            />
            <Trailer videoKey={trailer.key} backdrop={m.backdrop_path} />
          </section>
        ) : null}

        {cast.length ? (
          <section className="section">
            <SecHead title="Distribution" />
            <ul className="cast">
              {cast.slice(0, 18).map((c) => (
                <li key={`${c.id}-${c.character}`}>
                  <Link href={`/personne/${c.id}`}>{c.name}</Link>
                  {c.character ? <span> · {c.character}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="ext">
          {imdb ? (
            <>
              <a href={`https://www.imdb.com/title/${imdb}/`} target="_blank" rel="noopener">
                IMDb
              </a>
              <a href={`https://letterboxd.com/imdb/${imdb}/`} target="_blank" rel="noopener">
                Letterboxd
              </a>
            </>
          ) : null}
          <a href={`https://www.themoviedb.org/movie/${m.id}`} target="_blank" rel="noopener">
            TMDB
          </a>
        </div>

        <FilmRecs title={m.title} list={recs} />
      </div>
    </article>
  );
}
