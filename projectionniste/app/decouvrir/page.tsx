"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Paths } from "@/components/Doors";
import { FilmCard } from "@/components/FilmCard";
import { useProfile } from "@/components/ProfileProvider";
import { Tonight } from "@/components/Tonight";
import { Today } from "@/components/Today";
import { TitleDuo } from "@/components/TitleDuo";
import { TrailLine } from "@/components/Trail";
import { Onboarding } from "@/components/ui";
import { localDay, seeded, shuffle, type Proposal } from "@/lib/discover";
import { EDITORIAL } from "@/lib/editorial";
import { useAsync } from "@/lib/hooks";
import { cachedEditorial } from "@/lib/sets";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged } from "@/lib/types";

/** Des portes vers le catalogue : six sélections, tirées pour la journée, avec où tu en es. */
function Portes() {
  const { seen, status } = useProfile();
  const [items, setItems] = useState<{ key: string; kicker: string; title: string; meta: string }[] | null>(null);
  useEffect(() => {
    // les sagas restent dans le catalogue : ici, des mouvements, des pays, des palmarès
    const list = shuffle(EDITORIAL.filter((e) => e.family !== "Sagas"), seeded(`${localDay()}|portes`)).slice(0, 6);
    setItems(
      list.map((e) => {
        const ys = (e.films ?? []).map((f) => f[1]);
        const films = cachedEditorial(e.key);
        const k = films && status === "ready" ? films.filter((m) => seen.has(m.id)).length : null;
        const years = ys.length ? `${Math.min(...ys)}–${Math.max(...ys)}` : "";
        return { key: e.key, kicker: e.kicker, title: e.title, meta: [years, films ? (k ? `${k} vu${k > 1 ? "s" : ""} sur ${films.length}` : `${films.length} films`) : ""].filter(Boolean).join(" · ") };
      }),
    );
  }, [seen, status]);
  if (!items) return null;
  return (
    <section className="section portes" aria-labelledby="portes-title">
      <div className="sec-head">
        <h2 id="portes-title">
          Mouvements, <span>pays, palmarès</span>
        </h2>
        <span className="aside">
          <Link href="/ensembles">Tout le catalogue →</Link>
        </span>
      </div>
      <ul>
        {items.map((e) => (
          <li key={e.key}>
            <Link href={`/ensembles/${e.key}`}>
              <span className="label">{e.kicker}</span>
              <span className="pt">
                <TitleDuo title={e.title} />
              </span>
              {e.meta ? <span className="pm">{e.meta}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Six films en salles : l'actualité, à sa place (en bas). */
function EnSalles() {
  const films = useAsync(async () => (await tmdb<Paged<Movie>>("movie/now_playing", { region: "FR" })).results.filter((m) => m.poster_path).slice(0, 6), []);
  if (!films.data?.length) return null;
  return (
    <section className="section salles" aria-labelledby="salles-title">
      <div className="sec-head">
        <h2 id="salles-title">
          En salles <span>cette semaine</span>
        </h2>
        <span className="aside">
          <Link href="/decouvrir/populaires">Classements TMDB →</Link>
        </span>
      </div>
      <div className="salles-grid">
        {films.data.map((m) => (
          <FilmCard key={m.id} m={m} />
        ))}
      </div>
    </section>
  );
}

/**
 * Découvrir : une proposition du jour, trois chemins, une envie pour ce soir, des portes vers
 * le catalogue, et l'actualité en salles. Une page qui se termine.
 */
export default function Decouvrir() {
  const d = useProfile();
  const [today, setToday] = useState<Proposal[] | null>(null);
  // les chemins se calculent après la proposition du jour (elle passe en premier dans la file TMDB)
  const [late, setLate] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLate(true), 2500);
    return () => clearTimeout(t);
  }, []);
  // le cinéaste proposé aujourd'hui n'est pas repris dans les chemins
  const avoid = useMemo(() => {
    const m = today?.find((p) => p.kind === "director")?.more?.[1].match(/personne-(\d+)-/);
    return m ? +m[1] : null;
  }, [today]);

  return (
    <>
      <h1 className="sr-only">Découvrir</h1>
      <Onboarding />
      <Today heading="h2" onReady={setToday} />
      <div className="discover">
        <TrailLine />
        <Paths enabled={today !== null || late} avoidDirector={avoid} />
        <Tonight />
        <Portes />
        {d.status === "ready" ? <EnSalles /> : null}
      </div>
    </>
  );
}
