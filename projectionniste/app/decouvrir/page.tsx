"use client";

import Link from "next/link";
import { useProfile } from "@/components/ProfileProvider";
import { Rail } from "@/components/Rail";
import { EmptyInvite, MineToggle } from "@/components/ui";
import { filterMine, useAsync, useRecs } from "@/lib/hooks";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

export default function Decouvrir() {
  const d = useProfile();
  const recs = useRecs();
  const plat = [...d.platforms].join();

  const pourToi = useAsync<Ranked[]>(
    async () => (d.onlyMine ? await filterMine((recs.data ?? []).slice(0, 100), d.platforms) : recs.data ?? []).slice(0, 24),
    [recs.data, d.onlyMine, plat],
    !!recs.data,
  );
  const trending = useAsync<Ranked[]>(
    async () => {
      const ps = await Promise.all([1, 2].map((page) => tmdb<Paged<Movie>>("trending/movie/week", { page })));
      let l: Ranked[] = ps
        .flatMap((p) => p.results)
        .filter((m) => m.poster_path)
        .map((m) => ({ ...m, _pred: d.predict(m).v, _note: d.seen.has(m.id) ? "Déjà vu" : undefined }));
      if (d.onlyMine) l = await filterMine(l, d.platforms);
      return l.slice(0, 24);
    },
    [d.profile, d.onlyMine, plat],
  );

  return (
    <>
      <EmptyInvite />
      <div className="page-head">
        <h1>Découvrir</h1>
        <div className="filterbar">
          <MineToggle />
        </div>
      </div>
      <Rail
        title="Pour toi"
        sub={d.rated.size ? "D'après les films que tu as le mieux notés" : "Note quelques films pour affiner la sélection"}
        href="/decouvrir/pour-toi"
        list={pourToi.data}
        loading={!pourToi.data && !recs.error}
        empty={
          d.onlyMine ? (
            "Aucune recommandation disponible sur tes plateformes pour l'instant."
          ) : (
            <>
              Rien à proposer pour l'instant. <Link href="/parametres#import">Importe ton Letterboxd</Link> ou note quelques films.
            </>
          )
        }
      />
      <Rail title="Tendances de la semaine" sub="Ce que tout le monde regarde, avec ton indice" href="/decouvrir/populaires" list={trending.data} loading={!trending.data} />
    </>
  );
}
