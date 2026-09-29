"use client";

import Link from "next/link";
import { num1 } from "@/lib/format";
import type { Credits, Movie, Ranked } from "@/lib/types";
import { Star } from "./icons";
import { useProfile } from "./ProfileProvider";
import { Rail } from "./Rail";
import { useViewers } from "./Viewers";

/** Indice personnel (ou ta note), note TMDB, moyenne des membres et ce qui fait bouger l'indice. */
export function ScoreBox({ movie, credits }: { movie: Movie; credits: Credits }) {
  const { status, predict, rated } = useProfile();
  const viewers = useViewers(movie.id);
  const pred = status === "ready" ? predict(movie, credits) : null;
  const mine = rated.get(movie.id);
  const pos = pred?.why.filter((w) => w.a > 0).slice(0, 2) ?? [];
  const neg = pred?.why.filter((w) => w.a < 0).slice(0, 1) ?? [];
  // « Paul Dano », « le genre drame » (ou « du genre » après « moins fan »)
  const who = (w: { n: string; id?: number }, du = false) =>
    w.id ? (
      <Link key={w.n} href={`/personne/${w.id}`}>
        {w.n}
      </Link>
    ) : (
      <span key={w.n}>
        {du ? "du" : "le"} genre <b>{w.n.toLowerCase()}</b>
      </span>
    );
  return (
    <div className="scorebar">
      {mine ? (
        <span className="pill">
          <Star />
          {num1(mine)} · ta note
        </span>
      ) : pred ? (
        <span className="pill" title="La note que tu devrais lui donner, d'après tes goûts">
          <Star />
          {num1(pred.v)} · ton indice
        </span>
      ) : null}
      {movie.vote_count ? <span className="chip">TMDB {num1(movie.vote_average || 0)}</span> : null}
      {viewers?.avg != null ? <span className="chip">Membres {num1(viewers.avg)}</span> : null}
      {pos.length || neg.length ? (
        <span className="why">
          {pos.length ? (
            <>
              Tu aimes {pos.map((w, i) => (i ? [" et ", who(w)] : who(w)))}
            </>
          ) : null}
          {pos.length && neg.length ? " · " : null}
          {neg.length ? <>moins fan {neg[0].id ? "de " : ""}{who(neg[0], true)}</> : null}
        </span>
      ) : null}
    </div>
  );
}

/** « Dans le même esprit » : recommandations + similaires, déjà-vus retirés, classés par indice. */
export function FilmRecs({ list }: { title: string; list: Movie[] }) {
  const { status, seen, hidden, predict } = useProfile();
  if (status !== "ready") return null;
  const recs: Ranked[] = list
    .filter((m) => !seen.has(m.id) && !hidden.has(m.id))
    .map((m) => ({ ...m, _pred: predict(m).v }))
    .sort((a, b) => b._pred - a._pred)
    .slice(0, 16);
  if (!recs.length) return null;
  return <Rail title="Dans le même esprit" sub="Films que tu n'as pas encore vus, classés par ton indice" list={recs} />;
}
