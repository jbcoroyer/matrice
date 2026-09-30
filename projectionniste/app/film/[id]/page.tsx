import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FadeImg, Poster } from "@/components/Poster";
import { ScoreBox } from "@/components/FilmPersonal";
import { FilmHistory, FilmPanel } from "@/components/FilmPanel";
import { FilmSets } from "@/components/SetLinks";
import { FilmReviews } from "@/components/Reviews";
import { SeenBadge } from "@/components/SeenBadge";
import { TitleDuo } from "@/components/TitleDuo";
import { FilmViewers } from "@/components/Viewers";
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
      append_to_response: "credits,release_dates",
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
  const uniq = <T extends { id: number }>(l: T[]) => [...new Map(l.map((x) => [x.id, x])).values()];
  const byJob = (...jobs: string[]) => uniq(crew.filter((x) => jobs.includes(x.job)));
  const dirs = byJob("Director");
  const writers = byJob("Screenplay", "Writer", "Novel", "Story").slice(0, 3);
  const credits: [string, { id: number; name: string }[]][] = [
    ["Réalisation", dirs],
    ["Scénario", writers],
    ["Image", byJob("Director of Photography").slice(0, 2)],
    ["Montage", byJob("Editor").slice(0, 2)],
    ["Musique", byJob("Original Music Composer", "Music").slice(0, 2)],
    ["Décors", byJob("Production Design").slice(0, 1)],
    ["Costumes", byJob("Costume Design").slice(0, 1)],
    ["Production", byJob("Producer").slice(0, 3)],
  ];
  const studios = (m.production_companies ?? []).slice(0, 6);
  const fr = m.release_dates?.results.find((r) => r.iso_3166_1 === "FR");
  const cert = fr?.release_dates.map((d) => d.certification).find(Boolean);
  const frRelease = fr?.release_dates.find((d) => d.type === 3)?.release_date;
  const upcoming = frRelease && frRelease.slice(0, 10) > new Date().toISOString().slice(0, 10);

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
  const person = (p: { id: number; name: string }) => (
    <Link key={p.id} href={`/personne/${p.id}`}>
      {p.name}
    </Link>
  );
  const join = (arr: React.ReactNode[]) => arr.flatMap((x, i) => (i ? [", ", x] : [x]));
  const meta = [
    ...(m.genres ?? []).slice(0, 2).map((g) => GENRE_FR[g.id] || g.name),
    yearOf(m),
    runtime(m.runtime),
    cert ? `Visa ${cert}` : "",
    upcoming ? `En salles le ${new Date(frRelease!).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : "",
  ].filter(Boolean);
  const initials = (n: string) =>
    n
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("");

  return (
    <article className="film">
      <section className="film-hero">
        <div className="film-backdrop">{m.backdrop_path ? <img src={img(m.backdrop_path, "w1280")} alt="" /> : null}</div>
        <div className="wrap film-in">
          <div className="film-poster">
            <Poster path={m.poster_path} title={m.title} size="w500" eager>
              <SeenBadge id={m.id} />
            </Poster>
          </div>
          <div>
            <div className="meta-line label">
              {meta.map((x, i) => (
                <span key={i} style={{ display: "contents" }}>
                  {i ? <i className="sep" /> : null}
                  <span>{x}</span>
                </span>
              ))}
            </div>
            <h1 className="film-title">
              <TitleDuo title={m.title} />
            </h1>
            {m.original_title && m.original_title !== m.title ? <div className="orig">{m.original_title}</div> : null}
            {dirs.length || cast.length ? (
              <p className="film-by">
                {dirs.length ? <>Un film de {join(dirs.map(person))}</> : null}
                {dirs.length && cast.length ? " · " : null}
                {cast.length ? <>avec {join(cast.slice(0, 3).map(person))}</> : null}
              </p>
            ) : null}
            <ScoreBox movie={scoreMovie} />
            <FilmPanel film={film} />
            <FilmSets tmdbId={m.id} saga={m.belongs_to_collection ?? null} />
          </div>
        </div>
      </section>

      <div className="film-body">
        <div>
          <h2 className="block-title">Synopsis</h2>
          {m.tagline ? <p className="tagline-f">{m.tagline}</p> : null}
          {m.overview ? <p className="overview">{m.overview}</p> : <p className="note">Pas encore de résumé en français.</p>}
        </div>
        <FilmViewers tmdbId={m.id} />
      </div>

      <FilmHistory film={film} />

      {dirs.length || cast.length ? (
        <section className="section">
          <h2 className="block-title">
            Casting <span>et réalisation</span>
          </h2>
          {dirs.length ? (
            <div className="crew-row" style={{ marginBottom: 26 }}>
              {dirs.map((d) => (
                <Link key={d.id} href={`/personne/${d.id}`} className="crew">
                  <span className="ph">{d.profile_path ? <FadeImg src={img(d.profile_path, "w185")} alt="" /> : initials(d.name)}</span>
                  <span>
                    <span className="n">{d.name}</span>
                    <span className="r">Réalisation</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
          {cast.length ? (
            <div className="people-rail">
              {cast.slice(0, 20).map((c) => (
                <Link key={`${c.id}-${c.character}`} href={`/personne/${c.id}`} className="person-card">
                  <span className="ph">
                    {c.profile_path ? <FadeImg src={img(c.profile_path, "w185")} alt="" /> : <span className="ini">{initials(c.name)}</span>}
                  </span>
                  <span className="n">{c.name}</span>
                  {c.character ? <span className="r">{c.character}</span> : null}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {credits.some(([, l]) => l.length) || studios.length ? (
        <section className="generique-sec">
          <h2 className="block-title" style={{ justifyContent: "center" }}>
            Générique
          </h2>
          {dirs.length ? <p className="label">Un film de {dirs.map((d) => d.name).join(" et ")}</p> : null}
          <dl className="generique">
            {credits
              .filter(([, l]) => l.length)
              .map(([role, l]) => (
                <div key={role} style={{ display: "contents" }}>
                  <dt>{role}</dt>
                  <dd>{join(l.map(person))}</dd>
                </div>
              ))}
          </dl>
          {studios.length ? (
            <div className="studios">
              {studios.map((c) => (
                <Link key={c.id} href={`/studio/${c.id}`} className="studio" title={c.name}>
                  {c.logo_path ? <img src={img(c.logo_path, "w185")} alt={c.name} loading="lazy" /> : <span>{c.name}</span>}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <FilmReviews tmdbId={m.id} />

    </article>
  );
}
