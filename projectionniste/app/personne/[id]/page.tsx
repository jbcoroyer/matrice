import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Filmography } from "@/components/Filmography";
import { Bio } from "@/components/Bio";
import { Poster } from "@/components/Poster";
import { frDate, truncate } from "@/lib/format";
import { img } from "@/lib/tmdb";
import { tmdbFetch, TmdbError } from "@/lib/tmdb-server";
import type { Person, PersonCredits } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

const getPerson = cache(async (id: string) => {
  if (!/^\d+$/.test(id)) return null;
  try {
    const [p, en, credits] = await Promise.all([
      tmdbFetch<Person>(`person/${id}`),
      tmdbFetch<Person>(`person/${id}`, { language: "en-US" }).catch(() => null),
      tmdbFetch<PersonCredits>(`person/${id}/movie_credits`),
    ]);
    // biographie française si elle existe, sinon anglaise
    return { ...p, biography: p.biography || en?.biography || "", bioLang: p.biography ? "fr" : "en", credits };
  } catch (e) {
    if (e instanceof TmdbError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPerson(id).catch(() => null);
  if (!p) return { title: "Personne introuvable" };
  return {
    title: p.name,
    description: p.biography ? truncate(p.biography, 200) : undefined,
    openGraph: { title: p.name, images: p.profile_path ? [img(p.profile_path, "w500")] : undefined },
  };
}

const DEPT: Record<string, string> = { Directing: "Réalisation", Acting: "Interprétation", Writing: "Scénario", Camera: "Image", Sound: "Musique", Production: "Production", Editing: "Montage" };

export default async function PersonPage({ params }: Props) {
  const { id } = await params;
  const p = await getPerson(id);
  if (!p) notFound();

  const life = [p.birthday ? `Né·e le ${frDate(p.birthday)}` : "", p.place_of_birth || "", p.deathday ? `mort·e le ${frDate(p.deathday)}` : ""].filter(Boolean).join(" · ");

  return (
    <div className="view">
      <section className="person-head">
        <div className="poster-wrap">
          <Poster path={p.profile_path} title={p.name} size="w500" eager />
        </div>
        <div>
          <div className="kicker">{DEPT[p.known_for_department || ""] || "Cinéma"}</div>
          <h1>{p.name}</h1>
          {life ? <div className="facts">{life}</div> : null}
          {p.biography ? <Bio text={p.biography} lang={p.bioLang} /> : null}
          <div className="ext">
            {p.imdb_id ? (
              <a href={`https://www.imdb.com/name/${p.imdb_id}/`} target="_blank" rel="noopener">
                IMDb
              </a>
            ) : null}
            <a href={`https://www.themoviedb.org/person/${p.id}`} target="_blank" rel="noopener">
              TMDB
            </a>
          </div>
        </div>
      </section>
      <Filmography credits={p.credits} dept={p.known_for_department || "Acting"} name={p.name} />
    </div>
  );
}
