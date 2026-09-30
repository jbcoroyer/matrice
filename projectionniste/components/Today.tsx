"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildToday, type Part, type Proposal } from "@/lib/discover";
import { runtime, truncate, yearOf } from "@/lib/format";
import { GENRE_FR } from "@/lib/genres";
import { useAsync } from "@/lib/hooks";
import { img, tmdb } from "@/lib/tmdb";
import type { Credits, MovieDetail } from "@/lib/types";
import { useDiscoverCtx } from "./Doors";
import { Check, Plus } from "./icons";
import { useProfile } from "./ProfileProvider";
import { TitleDuo } from "./TitleDuo";

type Detail = MovieDetail & { credits?: Credits };
export const detail = (id: number) => tmdb<Detail>(`movie/${id}`, { append_to_response: "credits" });

/** Une phrase faite de texte et de liens. */
export function Sentence({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : (
          <Link key={i} href={p[1]}>
            {p[0]}
          </Link>
        ),
      )}
    </>
  );
}

/** « Drame · 1995 · 2 h 07 · David Fincher » */
export function FilmMeta({ m }: { m: Detail }) {
  const dirs = m.credits?.crew.filter((c) => c.job === "Director").slice(0, 2) ?? [];
  const bits = [...(m.genres ?? []).slice(0, 2).map((g) => GENRE_FR[g.id] || g.name), yearOf(m), runtime(m.runtime)].filter(Boolean);
  return (
    <div className="meta-line label">
      {bits.map((x, k) => (
        <span key={k} style={{ display: "contents" }}>
          {k ? <i className="sep" /> : null}
          <span>{x}</span>
        </span>
      ))}
      {dirs.map((p) => (
        <span key={p.id} style={{ display: "contents" }}>
          <i className="sep" />
          <Link href={`/personne/${p.id}`}>{p.name}</Link>
        </span>
      ))}
    </div>
  );
}

/**
 * « Aujourd'hui » : une seule proposition à la fois, avec sa raison. Trois par jour au plus,
 * de trois natures différentes ; elles changent le lendemain (ou dès qu'un film est vu).
 */
export function Today({ heading, onReady }: { heading: "h1" | "h2"; onReady: (l: Proposal[]) => void }) {
  const d = useProfile();
  const ctx = useDiscoverCtx();
  const [list, setList] = useState<Proposal[] | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!ctx) return;
    let alive = true;
    buildToday(ctx)
      .catch(() => [] as Proposal[])
      .then((l) => {
        if (!alive) return;
        setList(l);
        setI(0);
        onReady(l);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);

  const p = list?.[Math.min(i, list.length - 1)];
  const det = useAsync<Detail | null>(() => (p ? detail(p.id).catch(() => null) : Promise.resolve(null)), [p?.id]);
  // la proposition suivante se prépare pendant qu'on lit celle-ci
  useEffect(() => {
    const next = list?.[i + 1];
    if (next) detail(next.id).catch(() => {});
  }, [list, i]);

  if (list && !list.length) return null;
  const m = det.data && det.data.id === p?.id ? det.data : null;
  const H = heading;
  if (!p || !m)
    return (
      <section className="today" aria-busy="true" aria-label="Aujourd'hui">
        <div className="today-bg" />
        <div className="wrap today-in">
          <p className="label">Aujourd'hui</p>
          <span className="sk sk-line w40" />
          <span className="sk today-sk" />
        </div>
      </section>
    );

  const inWl = d.watchlist.has(m.id);
  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <section className="today" aria-labelledby="today-title">
      <div className="today-bg">{m.backdrop_path ? <img key={m.id} src={img(m.backdrop_path, "w1280")} alt="" /> : null}</div>
      <div className="wrap today-in">
        <p className="today-k">
          <span className="label">Aujourd'hui</span>
          <span className="today-date">{date}</span>
          <span className="label today-kind">{p.kicker}</span>
        </p>
        <p className="today-why">
          <Sentence parts={p.why} />
        </p>
        <H className="today-t" id="today-title">
          <Link href={`/film/${m.id}`}>
            <TitleDuo title={m.title} />
          </Link>
        </H>
        <FilmMeta m={m} />
        {m.overview && p.kind !== "pick" ? <p className="today-ov">{truncate(m.overview, 230)}</p> : null}
        <div className="today-actions">
          <button type="button" className={inWl ? "btn" : "btn primary"} aria-pressed={inWl} onClick={() => d.toggleWatchlist(m)}>
            {inWl ? <Check /> : <Plus />}
            {inWl ? "Dans ta watchlist" : "Ajouter à ma watchlist"}
          </button>
          <Link className="btn" href={`/film/${m.id}`}>
            Voir la fiche
          </Link>
          {p.more ? (
            <Link className="link-btn quiet today-more" href={p.more[1]}>
              {p.more[0]} →
            </Link>
          ) : null}
        </div>
        {list!.length > 1 ? (
          <div className="today-nav">
            <span className="today-dots" role="group" aria-label="Idées du jour">
              {list!.map((x, k) => (
                <button key={x.id} type="button" aria-current={k === i} aria-label={`Idée ${k + 1} sur ${list!.length}`} onClick={() => setI(k)} />
              ))}
            </span>
            {i < list!.length - 1 ? (
              <button type="button" className="link-btn" onClick={() => setI(i + 1)}>
                Une autre idée
              </button>
            ) : (
              <span>C'est tout pour aujourd'hui. D'autres idées demain.</span>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
