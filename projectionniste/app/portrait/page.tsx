"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bilan } from "@/components/Bilan";
import { useProfile } from "@/components/ProfileProvider";
import { duo, EmptyState, ErrorLine, ProfileGate, SecHead, StartActions } from "@/components/ui";
import { filmFacts, type Facts } from "@/lib/bilan";
import { peopleHighlights, quickHighlights } from "@/lib/highlights";
import { num1 } from "@/lib/format";
import { tmdb } from "@/lib/tmdb";
import { useAsync } from "@/lib/hooks";
import { loadSeenFilms, type SeenFilm } from "@/lib/db";

const STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function Histogram({ ratings }: { ratings: number[] }) {
  const counts = STEPS.map((s) => ratings.filter((r) => Math.abs(r - s) < 0.01).length);
  const max = Math.max(1, ...counts);
  const modeIdx = counts.indexOf(max);
  const [hover, setHover] = useState<number | null>(null);
  return (
    <figure style={{ margin: 0 }}>
      <div className="histo" aria-hidden="true">
        {counts.map((c, i) => {
          const h = `${(c / max) * 100}%`;
          const label = hover === i || (hover === null && i === modeIdx);
          return (
            <div key={i} style={{ "--h": h } as React.CSSProperties} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={`${num1(STEPS[i])} ★ : ${c} films`}>
              {label ? <span className="v">{c}</span> : null}
              <i style={{ height: h }} />
            </div>
          );
        })}
      </div>
      <div className="histo-x" aria-hidden="true">
        {STEPS.map((s) => (
          <span key={s}>{num1(s).replace(",0", "")}</span>
        ))}
      </div>
      <figcaption className="note" style={{ textAlign: "center", marginTop: 4 }}>Note sur 5 étoiles</figcaption>
      <table className="sr-only">
        <caption>Répartition de tes notes</caption>
        <tbody>
          {STEPS.map((s, i) => (
            <tr key={s}>
              <th>{num1(s)} sur 5</th>
              <td>{counts[i]} films</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

const FACTS_CAP = 400;

/** Les gros highlights : réalisateur, acteur, genre et époque les plus vus, film le mieux noté. */
function Highlights() {
  const { sb, seen } = useProfile();
  const [films, setFilms] = useState<SeenFilm[] | null>(null);
  const [facts, setFacts] = useState<Map<number, Facts>>(new Map());
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!sb) return;
    let alive = true;
    (async () => {
      const list = await loadSeenFilms(sb);
      if (!alive) return;
      setFilms(list);
      // les crédits (réalisateurs, acteurs) demandent une requête par film : les mieux notés d'abord, 400 au plus
      const ids = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || +b.favorite - +a.favorite).slice(0, FACTS_CAP).map((f) => f.tmdb_id);
      const all = new Map<number, Facts>();
      for (let k = 0; k < ids.length && alive; k += 60) {
        const chunk = await filmFacts(ids.slice(k, k + 60), (d) => alive && setProgress([k + d, ids.length]));
        chunk.forEach((v, id) => all.set(id, v));
        if (alive) setFacts(new Map(all));
      }
      if (alive) setProgress(null);
    })().catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [sb, seen.size]);

  const items = useMemo(() => (films ? [...peopleHighlights(films, facts), ...quickHighlights(films)] : []), [films, facts]);
  const order = ["director", "actor", "genre", "decade", "best"];
  items.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  if (error) return <ErrorLine error={error} />;
  if (films && !films.length)
    return (
      <EmptyState title="Tes highlights apparaîtront ici" actions={<StartActions />}>
        Marque des films comme vus ou journalise-en : on y verra ton réalisateur, ton acteur et ton genre les plus vus, ton époque, ton film le mieux noté.
      </EmptyState>
    );
  const capped = films && films.length > FACTS_CAP;
  return (
    <>
      <ul className="hl" aria-busy={!!progress}>
        {items.map((h) => (
          <li key={h.key}>
            <span className="lbl">{h.label}</span>
            <b>{h.href ? <Link href={h.href}>{duo(h.value)}</Link> : duo(h.value)}</b>
            <span className="dim">{h.note}</span>
          </li>
        ))}
        {!films ? <li aria-hidden><span className="sk sk-line w60" /></li> : null}
      </ul>
      {progress ? (
        <p className="note" role="status">
          Recherche de ton réalisateur et de ton acteur préférés… {progress[0]} / {progress[1]}
        </p>
      ) : capped ? (
        <p className="note">Réalisateur et acteur : d'après tes {FACTS_CAP} films les mieux notés.</p>
      ) : null}
    </>
  );
}

function Portrait() {
  const { seen, rated, watchlist, owned } = useProfile();
  const [vue, setVue] = useState<"toujours" | "annee">("toujours");
  useEffect(() => {
    if (new URLSearchParams(location.search).get("vue") === "annee") setVue("annee");
  }, []);
  const pick = (v: typeof vue) => {
    setVue(v);
    history.replaceState(null, "", v === "annee" ? "/portrait?vue=annee" : "/portrait");
  };
  const ratings = useMemo(() => [...rated.values()], [rated]);
  const avg = ratings.length ? ratings.reduce((s, x) => s + x, 0) / ratings.length : 0;
  const fives = useMemo(() => [...rated.entries()].filter(([, r]) => r >= 5).length, [rated]);

  return (
    <>
      <section className="section">
        <SecHead as="h1" title="Mes chiffres" />
        <div className="tabs-row">
          <div className="seg" role="radiogroup" aria-label="Période">
            <button type="button" role="radio" aria-checked={vue === "toujours"} onClick={() => pick("toujours")}>
              Depuis toujours
            </button>
            <button type="button" role="radio" aria-checked={vue === "annee"} onClick={() => pick("annee")}>
              Une année
            </button>
          </div>
        </div>
      </section>

      {vue === "annee" ? (
        <Bilan />
      ) : (
        <>
          <section className="section">
            <div className="stats">
              <div>
                <span className="lbl">Films vus</span>
                <b>{seen.size.toLocaleString("fr-FR")}</b>
              </div>
              <div>
                <span className="lbl">Notés</span>
                <b>{rated.size.toLocaleString("fr-FR")}</b>
              </div>
              <div>
                <span className="lbl">Note moyenne</span>
                <b>{num1(avg)}</b>
              </div>
              <div>
                <span className="lbl">Cinq étoiles</span>
                <b>{fives}</b>
              </div>
              <div>
                <span className="lbl">À voir</span>
                <b>{watchlist.size.toLocaleString("fr-FR")}</b>
              </div>
              <div>
                <span className="lbl">Disques</span>
                <b>{owned.size.toLocaleString("fr-FR")}</b>
              </div>
            </div>
            <p className="note" style={{ marginTop: 16 }}>
              <Link className="link" href="/journal?onglet=vus">
                Tous tes films vus
              </Link>
              {" · "}
              <Link className="link" href="/parcours">
                Tes parcours
              </Link>
              {" · "}
              <Link className="link" href="/collection/registre">
                Les chiffres de ta collection
              </Link>
            </p>
          </section>

          {ratings.length ? (
            <section className="section">
              <SecHead title="Tes notes" aside="Nombre de films par note" />
              <Histogram ratings={ratings} />
            </section>
          ) : null}

          <section className="section">
            <SecHead title="Tes highlights" />
            <Highlights />
          </section>
        </>
      )}
    </>
  );
}

export default function Page() {
  return (
    <div>
      <ProfileGate>
        <Portrait />
      </ProfileGate>
    </div>
  );
}
