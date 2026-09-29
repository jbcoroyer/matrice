"use client";

import Link from "next/link";
import { useState } from "react";
import { num1 } from "@/lib/format";
import { dedupeProviders, img, streamable } from "@/lib/tmdb";
import type { Credits, Movie, Provider, ProviderOffers, Ranked } from "@/lib/types";
import { FilmGrid } from "./FilmGrid";
import { Play } from "./icons";
import { useProfile } from "./ProfileProvider";
import { SecHead } from "./ui";

/** Indice personnel, note TMDB et ce qui fait bouger l'indice. */
export function ScoreBox({ movie, credits }: { movie: Movie; credits: Credits }) {
  const { status, predict, rated } = useProfile();
  const pred = status === "ready" ? predict(movie, credits) : null;
  const mine = rated.get(movie.id);
  const value = mine ?? pred?.v;
  return (
    <div className="score">
      <div>
        <span className="big">{value != null ? num1(value) : "…"}</span>
        <span className="of">/5</span>
        <strong>{mine ? "Ta note" : "Ton indice"}</strong>
        {mine && pred ? <span className="sub"> (indice prédit : {num1(pred.v)})</span> : null}
      </div>
      <div className="sub">
        TMDB {num1(movie.vote_average || 0)} · {(movie.vote_count || 0).toLocaleString("fr-FR")} votes
      </div>
      {pred && pred.why.length ? (
        <div className="why">
          {pred.why.map((w) => {
            const cls = w.a > 0 ? "pos" : "neg";
            const body = (
              <>
                {w.a > 0 ? "+" : "−"} {w.n} <em>{w.r}</em>
              </>
            );
            return w.id ? (
              <Link key={w.n + w.r} className={cls} href={`/personne/${w.id}`}>
                {body}
              </Link>
            ) : (
              <span key={w.n + w.r} className={cls}>
                {body}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ProvRow({ label, list, mine }: { label: string; list?: Provider[]; mine: Set<number> }) {
  const arr = dedupeProviders(list);
  if (!arr.length) return null;
  return (
    <div className="row">
      <small>{label}</small>
      <span className="provs prov-lg">
        {arr.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.provider_id}
            src={img(p.logo_path, "w92")}
            alt={p.provider_name}
            title={`${p.provider_name}${mine.has(p.provider_id) ? " (abonné)" : ""}`}
            className={mine.has(p.provider_id) ? "mine" : undefined}
          />
        ))}
      </span>
    </div>
  );
}

export function WhereToWatch({ fr }: { fr: ProviderOffers | null }) {
  const { platforms } = useProfile();
  const onMine = streamable(fr).some((p) => platforms.has(p.provider_id));
  return (
    <div className="where">
      <h2>Où le voir en France</h2>
      {fr ? (
        <>
          {platforms.size ? <p className="note" style={{ margin: "0 0 10px" }}>{onMine ? "Disponible sur une de tes plateformes." : "Pas sur tes plateformes pour l'instant."}</p> : null}
          <ProvRow label="Abonnement" list={streamable(fr)} mine={platforms} />
          <ProvRow label="Location" list={fr.rent} mine={platforms} />
          <ProvRow label="Achat" list={fr.buy} mine={platforms} />
          {fr.link ? (
            <a className="link-btn" href={fr.link} target="_blank" rel="noopener">
              Voir les offres
            </a>
          ) : null}
        </>
      ) : (
        <p className="note" style={{ margin: 0 }}>
          Aucune offre en France pour l'instant.
        </p>
      )}
    </div>
  );
}

export function Trailer({ videoKey, backdrop }: { videoKey: string; backdrop?: string | null }) {
  const [play, setPlay] = useState(false);
  return (
    <div
      className="trailer"
      style={!play && backdrop ? { backgroundImage: `linear-gradient(rgb(0 0 0 / .45),rgb(0 0 0 / .45)),url(${img(backdrop, "w1280")})` } : undefined}
    >
      {play ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoKey)}?autoplay=1&rel=0`}
          title="Bande-annonce"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button type="button" className="btn primary play" onClick={() => setPlay(true)}>
          <Play /> Lancer la bande-annonce
        </button>
      )}
    </div>
  );
}

/** « Dans le même esprit » : recommandations + similaires, déjà-vus retirés, classés par indice. */
export function FilmRecs({ title, list }: { title: string; list: Movie[] }) {
  const { status, seen, hidden, predict } = useProfile();
  if (status !== "ready") return null;
  const recs: Ranked[] = list
    .filter((m) => !seen.has(m.id) && !hidden.has(m.id))
    .map((m) => ({ ...m, _pred: predict(m).v }))
    .sort((a, b) => b._pred - a._pred)
    .slice(0, 12);
  if (!recs.length) return null;
  return (
    <section className="section">
      <SecHead title={`Dans le même esprit que ${title}`} aside="Films déjà vus exclus" />
      <FilmGrid list={recs} step={12} />
    </section>
  );
}
