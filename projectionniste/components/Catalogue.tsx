"use client";

import Link from "next/link";
import { TitleDuo } from "@/components/TitleDuo";
import { SecHead } from "@/components/ui";
import { EDITORIAL, FAMILIES, type EditorialDef } from "@/lib/editorial";
import { useAsync } from "@/lib/hooks";
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

/** Le catalogue : les mêmes parcours pour tout le monde, rangés par famille. */
export function Catalogue({ title = "Le catalogue" }: { title?: string }) {
  return (
    <section className="section catalogue-sec" aria-labelledby="cat-title">
      <div className="sec-head">
        <h2 id="cat-title">{title}</h2>
        <span className="aside">Mouvements, cinémas du monde, palmarès, studios, sagas</span>
      </div>
      {FAMILIES.map((fam) => (
        <div key={fam} className="cat-fam">
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
        </div>
      ))}
    </section>
  );
}
