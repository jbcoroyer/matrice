"use client";

import Link from "next/link";
import { num1, yearOf } from "@/lib/format";
import type { Ranked } from "@/lib/types";
import { Check, Plus } from "./icons";
import { Poster } from "./Poster";
import { ProviderIcons } from "./ProviderIcons";
import { useProfile } from "./ProfileProvider";

export function FilmCard({ m, showProviders = true }: { m: Ranked; showProviders?: boolean }) {
  const { seen, watchlist, rated, predict, toggleWatchlist } = useProfile();
  const p = m._pred ?? predict(m).v;
  const inWl = watchlist.has(m.id);
  const isSeen = seen.has(m.id);
  const r = rated.get(m.id);
  const badge = inWl ? <span className="badge">Watchlist</span> : isSeen ? <span className="badge">Vu{r ? ` · ${num1(r)}` : ""}</span> : null;

  return (
    <article className="card">
      <Link href={`/film/${m.id}`} prefetch={false}>
        <Poster path={m.poster_path} title={m.title}>
          {badge}
        </Poster>
        <h3>{m.title}</h3>
        <div className="meta">
          {yearOf(m)}
          {p > 0 ? (
            <>
              {" · "}indice <b title="Ta note prédite, sur 5">{num1(p)}</b>
            </>
          ) : null}
        </div>
        {m._note ? <div className="dir">{m._note}</div> : null}
        {m._because ? <div className="dir">Parce que tu as aimé {m._because}</div> : null}
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
