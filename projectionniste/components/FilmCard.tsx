"use client";

import Link from "next/link";
import { num1, yearOf } from "@/lib/format";
import type { Ranked } from "@/lib/types";
import { ownedLabel } from "@/lib/collection";
import { Bookmark, Check, Eye, Plus } from "./icons";
import { Poster } from "./Poster";
import { useProfile } from "./ProfileProvider";

export function FilmCard({ m }: { m: Ranked }) {
  const { seen, watchlist, rated, owned, toggleWatchlist, status } = useProfile();
  const inWl = watchlist.has(m.id);
  const isSeen = seen.has(m.id);
  const r = rated.get(m.id);
  const formats = owned.get(m.id);
  const badge = isSeen ? (
    <span className="badge" title={r ? `Vu, ta note : ${num1(r)}` : "Vu"} aria-label={r ? `Vu, ta note : ${num1(r)}` : "Vu"}>
      <Eye />
      {r ? num1(r) : null}
    </span>
  ) : inWl ? (
    <span className="badge wl" title="Dans ta watchlist" aria-label="Dans ta watchlist">
      <Bookmark />
    </span>
  ) : null;

  return (
    <article className="card">
      <Link href={`/film/${m.id}`} prefetch={false}>
        <Poster path={m.poster_path} title={m.title} owned={formats?.length ? ownedLabel(formats) : null}>
          {badge}
        </Poster>
        <div className="card-title">{m.title}</div>
        <div className="meta">{yearOf(m)}</div>
        {m._note ? <div className="dir">{m._note}</div> : null}
      </Link>
      {!isSeen && status === "ready" ? (
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
    </article>
  );
}
