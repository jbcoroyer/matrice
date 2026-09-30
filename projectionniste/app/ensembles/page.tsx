"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/components/ProfileProvider";
import { modeHref } from "@/components/SetView";
import { TitleDuo } from "@/components/TitleDuo";
import { SecHead } from "@/components/ui";
import { EDITORIAL, FAMILIES, type EditorialDef } from "@/lib/editorial";
import { useAsync } from "@/lib/hooks";
import { mySets, setProgress, type MySet, type Progress } from "@/lib/sets";
import { img, tmdb } from "@/lib/tmdb";
import type { Movie, Paged } from "@/lib/types";

/** Trois affiches pour donner le ton d'un ensemble (sans tout résoudre). */
function Glimpse({ def }: { def: EditorialDef }) {
  const posters = useAsync<string[]>(async () => {
    if (def.saga) return ((await tmdb<{ parts: Movie[] }>(`collection/${def.saga}`)).parts ?? []).map((m) => m.poster_path).filter((p): p is string => !!p).slice(0, 3);
    if (def.company) return ((await tmdb<Paged<Movie>>("discover/movie", { with_companies: def.company, sort_by: "vote_count.desc" })).results ?? []).map((m) => m.poster_path).filter((p): p is string => !!p).slice(0, 3);
    const found = await Promise.all((def.films ?? []).slice(0, 3).map(([q, year]) => tmdb<Paged<Movie>>("search/movie", { query: q, year }).then((r) => r.results?.[0]?.poster_path ?? null, () => null)));
    return found.filter((p): p is string => !!p);
  }, [def.key]);
  return (
    <span className="glimpse" aria-hidden="true">
      {(posters.data ?? [null, null, null]).map((p, i) => (
        <span key={i} className="glimpse-p">{p ? <img src={img(p, "w185")} alt="" loading="lazy" /> : null}</span>
      ))}
    </span>
  );
}

/** Le catalogue : les mêmes ensembles pour tout le monde, et ce que tu suis déjà. */
export default function Catalogue() {
  const { sb, status } = useProfile();
  const [mine, setMine] = useState<MySet[] | null>(null);
  const [progress, setProg] = useState<Progress[]>([]);
  useEffect(() => {
    if (!sb || status !== "ready") return;
    mySets(sb).then(setMine, () => setMine([]));
    setProgress(sb).then(setProg, () => {});
  }, [sb, status]);
  const prog = useMemo(() => new Map(progress.map((p) => [`${p.set_id}:${p.mode}`, p])), [progress]);
  const followed = (mine ?? []).filter((s) => s.follows.length);

  return (
    <>
      <section className="section catalogue-head">
        <p className="label">Catalogue</p>
        <h1>
          Rayons <span>et cycles</span>
        </h1>
        <p className="lede">
          Un ensemble de films se suit de deux façons : comme un <b>rayon</b> de ta collection, pour les posséder, ou comme un <b>cycle</b> de ton journal, pour les voir. Pour
          un cinéaste ou un acteur, passe par sa fiche.
        </p>
      </section>

      {followed.length ? (
        <section className="section">
          <SecHead title="Ce que tu suis" />
          <ul className="followed">
            {followed.map((s) => (
              <li key={s.id}>
                <Link href={`/ensembles/${s.key}`} className="followed-t">
                  <TitleDuo title={s.title} />
                </Link>
                <span className="dim">{s.subtitle}</span>
                <span className="followed-modes">
                  {s.follows.map((f) => {
                    const p = prog.get(`${s.id}:${f.mode}`);
                    return (
                      <Link key={f.mode} href={modeHref(f.mode, s.key)}>
                        {f.mode === "own" ? "Rayon" : "Cycle"} {p ? `${p.done} / ${p.total}` : ""}
                      </Link>
                    );
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {FAMILIES.map((fam) => (
        <section key={fam} className="section">
          <SecHead title={fam} />
          <ul className="catalogue">
            {EDITORIAL.filter((e) => e.family === fam).map((e) => (
              <li key={e.key}>
                <Link href={`/ensembles/${e.key}`}>
                  <Glimpse def={e} />
                  <span className="cat-text">
                    <span className="cat-t">
                      <TitleDuo title={e.title} />
                    </span>
                    <span className="cat-d">{e.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
