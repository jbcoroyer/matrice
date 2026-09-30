"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { tonight, type Envie, type Idea } from "@/lib/discover";
import { useAsync } from "@/lib/hooks";
import { img } from "@/lib/tmdb";
import { useDiscoverCtx } from "./Doors";
import { Check, Plus } from "./icons";
import { useProfile } from "./ProfileProvider";
import { detail, FilmMeta } from "./Today";
import { TitleDuo } from "./TitleDuo";
import { ErrorLine, Loader } from "./ui";

/** Trois films par envie, pas davantage : on choisit, on ne fait pas défiler. */
const MAX = 3;

const ENVIES: { k: Envie; l: string; end: string; link?: [string, string] }[] = [
  { k: "court", l: "Moins de 1 h 40", end: "Trois idées, c'est assez pour un soir." },
  { k: "possede", l: "Possédé, pas vu", end: "Les autres attendent sur ton étagère.", link: ["Ta collection", "/collection"] },
  { k: "watchlist", l: "Dans ma watchlist", end: "Le reste de ta watchlist t'attend.", link: ["Ta watchlist", "/watchlist"] },
  { k: "classique", l: "Un classique", end: "Trois idées, c'est assez pour un soir." },
];

function IdeaCard({ idea, n, total, onNext, envie }: { idea: Idea; n: number; total: number; onNext: () => void; envie: (typeof ENVIES)[number] }) {
  const d = useProfile();
  const det = useAsync(() => detail(idea.id).catch(() => null), [idea.id]);
  const m = det.data?.id === idea.id ? det.data : null;
  if (!m) return <Loader text="Un instant…" />;
  const inWl = d.watchlist.has(m.id);
  return (
    <article className="idea" aria-live="polite">
      <Link href={`/film/${m.id}`} className="idea-still" tabIndex={-1} aria-hidden="true">
        {m.backdrop_path || m.poster_path ? <img key={m.id} src={img(m.backdrop_path || m.poster_path, "w780")} alt="" /> : null}
      </Link>
      <div>
        <h3 className="idea-t">
          <Link href={`/film/${m.id}`}>
            <TitleDuo title={m.title} />
          </Link>
        </h3>
        <FilmMeta m={m} />
        <p className="idea-why">{idea.why}</p>
        <div className="idea-actions">
          <Link className="btn primary" href={`/film/${m.id}`}>
            Voir la fiche
          </Link>
          <button type="button" className="btn" aria-pressed={inWl} onClick={() => d.toggleWatchlist(m)}>
            {inWl ? <Check /> : <Plus />}
            {inWl ? "Dans ta watchlist" : "Watchlist"}
          </button>
        </div>
        <p className="idea-foot">
          {n + 1 < total ? (
            <button type="button" className="link-btn" onClick={onNext}>
              Un autre
            </button>
          ) : (
            <span>
              {envie.end}{" "}
              {envie.link ? (
                <Link className="link" href={envie.link[1]}>
                  {envie.link[0]}
                </Link>
              ) : null}
            </span>
          )}
          <span className="idea-n">
            {n + 1} / {total}
          </span>
        </p>
      </div>
    </article>
  );
}

/** « Ce soir ? » : une envie, un film. Pas de filtres, pas de grille. */
export function Tonight() {
  const d = useProfile();
  const ctx = useDiscoverCtx();
  const [envie, setEnvie] = useState<Envie | null>(null);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (!envie || !ctx) return;
    let alive = true;
    setIdeas(null);
    setError(null);
    setAt(0);
    tonight(envie, ctx).then(
      (l) => alive && setIdeas(l),
      (e) => alive && setError(e),
    );
    return () => {
      alive = false;
    };
    // l'envie seule relance la recherche (pas un film ajouté à la watchlist)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envie, !!ctx]);

  if (!ctx) return null;
  const unseenOwned = [...d.owned.keys()].filter((id) => !d.seen.has(id)).length;
  const shown = ENVIES.filter((e) => (e.k === "possede" ? unseenOwned > 0 : e.k === "watchlist" ? d.watchlist.size > 0 : true));
  const current = ENVIES.find((e) => e.k === envie);
  // un film vu entre-temps sort de la liste
  const list = (ideas ?? []).filter((x) => !d.seen.has(x.id));
  const total = Math.min(MAX, list.length);

  return (
    <section className="section tonight" aria-labelledby="tonight-title">
      <div className="sec-head">
        <h2 id="tonight-title">
          Ce <span>soir ?</span>
        </h2>
        <span className="aside">Une envie, un film.</span>
      </div>
      <div className="envies" role="group" aria-label="Ton envie">
        {shown.map((e) => (
          <button key={e.k} type="button" aria-pressed={envie === e.k} onClick={() => setEnvie(envie === e.k ? null : e.k)}>
            {e.l}
            {e.k === "possede" ? <i>{unseenOwned}</i> : e.k === "watchlist" ? <i>{d.watchlist.size}</i> : null}
          </button>
        ))}
      </div>
      {envie && current ? (
        error ? (
          <ErrorLine error={error} />
        ) : !ideas ? (
          <Loader text="Je cherche…" />
        ) : !list.length ? (
          <p className="note idea-none">Rien pour cette envie pour l'instant.</p>
        ) : (
          <IdeaCard idea={list[Math.min(at, total - 1)]} n={Math.min(at, total - 1)} total={total} envie={current} onNext={() => setAt((x) => x + 1)} />
        )
      ) : null}
    </section>
  );
}
