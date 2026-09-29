"use client";

import Link from "next/link";
import { GENRE_FR } from "@/lib/genres";
import { genreIds } from "@/lib/predict";
import { num1, yearOf } from "@/lib/format";
import type { Ranked } from "@/lib/types";
import { Check, Plus } from "./icons";
import { Poster } from "./Poster";
import { ProviderIcons } from "./ProviderIcons";
import { useProfile } from "./ProfileProvider";

export function FilmCard({ m, i = 0, showProviders = true }: { m: Ranked; i?: number; showProviders?: boolean }) {
  const { seen, watchlist, rated, predict, toggleWatchlist } = useProfile();
  const p = m._pred ?? predict(m).v;
  const g = genreIds(m)
    .slice(0, 2)
    .map((id) => GENRE_FR[id])
    .filter(Boolean)
    .join(" · ");
  const inWl = watchlist.has(m.id);
  const isSeen = seen.has(m.id);
  const r = rated.get(m.id);
  const badge = inWl ? <span className="badge red">Watchlist</span> : isSeen ? <span className="badge">Vu{r ? ` · ${num1(r)}` : ""}</span> : null;

  return (
    <article className="card" style={{ animationDelay: `${Math.min(i % 30, 18) * 40}ms` }}>
      <Link href={`/film/${m.id}`} prefetch={false}>
        <Poster path={m.poster_path} title={m.title}>
          {badge}
        </Poster>
        <div className="meta">{[yearOf(m), g].filter(Boolean).join(" · ")}</div>
        <h3>{m.title}</h3>
        {m._note ? <div className="dir">{m._note}</div> : null}
        {m._because ? <div className="dir">Parce que tu as aimé {m._because}</div> : null}
        {p > 0 ? (
          <div className="indice" title="Ta note prédite, sur 5">
            <span>Indice</span>
            <span className="gauge">
              <i style={{ width: `${((p / 5) * 100).toFixed(0)}%` }} />
            </span>
            <b>{num1(p)}</b>
          </div>
        ) : null}
      </Link>
      {!isSeen ? (
        <button
          type="button"
          className="quick"
          aria-pressed={inWl}
          aria-label={inWl ? `Retirer ${m.title} de la watchlist` : `Ajouter ${m.title} à la watchlist`}
          title={inWl ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
          onClick={() => toggleWatchlist(m)}
        >
          {inWl ? <Check /> : <Plus />}
        </button>
      ) : null}
      {showProviders ? <ProviderIcons id={m.id} /> : null}
    </article>
  );
}
