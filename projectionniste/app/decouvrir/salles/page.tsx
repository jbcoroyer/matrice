"use client";

import { FilmGrid } from "@/components/FilmGrid";
import { useProfile } from "@/components/ProfileProvider";
import { ErrorLine, ProfileGate, SecHead, SkeletonGrid } from "@/components/ui";
import { frDate, today } from "@/lib/format";
import { useAsync } from "@/lib/hooks";
import { tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Ranked } from "@/lib/types";

async function pages(path: string, n: number) {
  const ps = await Promise.all(Array.from({ length: n }, (_, k) => tmdb<Paged<Movie>>(path, { region: "FR", page: k + 1 })));
  const s = new Set<number>();
  return ps.flatMap((p) => p.results || []).filter((m) => m.poster_path && !s.has(m.id) && (s.add(m.id), true));
}

function Salles() {
  const d = useProfile();
  const now = useAsync<Ranked[]>(
    async () =>
      (await pages("movie/now_playing", 3))
        .map((m) => ({ ...m, _pred: d.predict(m).v, _note: d.seen.has(m.id) ? "Déjà vu" : undefined }))
        .sort((a, b) => b._pred - a._pred),
    [d.profile, d.seen.size],
  );
  const soon = useAsync<Ranked[]>(
    async () => {
      const t = today();
      return (await pages("movie/upcoming", 3))
        .filter((m) => (m.release_date || "") > t)
        .map((m) => ({ ...m, _pred: d.predict(m).v, _note: `Sortie le ${frDate(m.release_date, { day: "numeric", month: "long" })}` }))
        .sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
    },
    [d.profile],
  );
  return (
    <>
      <section className="section">
        <SecHead title="En salles" aside="En France, classé par ton indice" />
        {now.error ? <ErrorLine error={now.error} onRetry={now.reload} /> : now.data ? <FilmGrid list={now.data} step={20} /> : <SkeletonGrid n={10} />}
      </section>
      <section className="section">
        <SecHead title="Prochaines sorties" aside="Par date de sortie en France" />
        {soon.error ? (
          <ErrorLine error={soon.error} onRetry={soon.reload} />
        ) : soon.data ? (
          soon.data.length ? (
            <FilmGrid list={soon.data} step={20} />
          ) : (
            <p className="status">Pas de sortie annoncée pour l'instant.</p>
          )
        ) : (
          <SkeletonGrid n={10} />
        )}
      </section>
    </>
  );
}

export default function Page() {
  return (
    <div>
      <ProfileGate>
        <Salles />
      </ProfileGate>
    </div>
  );
}
