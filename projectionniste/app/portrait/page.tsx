"use client";

import { errorText } from "@/lib/errors";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PickFilm } from "@/components/PickFilm";
import { Plus } from "@/components/icons";
import { useProfile, type FilmInput } from "@/components/ProfileProvider";
import { profileHref } from "@/lib/publicProfile";
import { duo, EmptyState, ErrorLine, ProfileGate, SecHead, StartActions } from "@/components/ui";
import { filmFacts, type Facts } from "@/lib/bilan";
import { peopleHighlights, quickHighlights } from "@/lib/highlights";
import { num1 } from "@/lib/format";
import { tmdb } from "@/lib/tmdb";
import { useAsync } from "@/lib/hooks";
import { filmRow, loadSeenFilms, type SeenFilm } from "@/lib/db";
import { clearTopSlot, loadTop, setTopSlot, type TopFilm } from "@/lib/diary";
import { Poster } from "@/components/Poster";

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

function TopFive() {
  const { sb, userId, toast } = useProfile();
  const [top, setTop] = useState<TopFilm[] | null>(null);
  const [edit, setEdit] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const load = useCallback(() => {
    if (sb && userId) loadTop(sb, userId).then(setTop, () => setTop([]));
  }, [sb, userId]);
  useEffect(load, [load]);
  const slots = [1, 2, 3, 4, 5].map((n) => top?.find((t) => t.slot === n));
  const filled = slots.filter(Boolean).length;

  const choose = async (m: FilmInput) => {
    if (!sb || !userId || !picking) return;
    const slot = picking;
    setPicking(null);
    try {
      await setTopSlot(sb, userId, filmRow(m), slot);
      toast(`« ${m.title} » en n° ${slot} de ton top 5`);
      load();
    } catch (e) {
      toast(`Échec : ${errorText(e)}`);
    }
  };
  const clear = async (slot: number, title?: string) => {
    if (!sb || !userId) return;
    try {
      await clearTopSlot(sb, userId, slot);
      toast(`${title ? `« ${title} »` : "Le film"} retiré de ton top 5`);
      load();
    } catch (e) {
      toast(`Échec : ${errorText(e)}`);
    }
  };

  return (
    <section className="section">
      <SecHead
        title="Top 5"
        aside={
          <span className="aside top-aside">
            {filled < 5 ? "Clique sur une affiche vide pour l'ajouter" : null}
            {filled ? (
              <button type="button" className="btn ghost small" aria-pressed={edit} onClick={() => setEdit((v) => !v)}>
                {edit ? "Terminer" : "Modifier"}
              </button>
            ) : null}
          </span>
        }
      />
      <div className="grid top5">
        {slots.map((t, i) =>
          t ? (
            <div key={i} className="card">
              <Link href={`/film/${t.tmdb_id}`}>
                <Poster path={t.films?.poster_path} title={t.films?.title ?? ""} />
                <h3>
                  {i + 1}. {t.films?.title}
                </h3>
              </Link>
              {edit ? (
                <div className="top-ctl">
                  <button type="button" onClick={() => setPicking(i + 1)}>
                    Changer
                  </button>
                  <button type="button" onClick={() => clear(i + 1, t.films?.title)} aria-label={`Retirer ${t.films?.title ?? "ce film"} du top 5`}>
                    Retirer
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div key={i} className="card">
              <button type="button" className="top-empty" onClick={() => setPicking(i + 1)} aria-label={`Choisir le film n° ${i + 1} de ton top 5`}>
                <span className="poster">
                  <span className="noimg">
                    <Plus />
                  </span>
                </span>
                <h3>{i + 1}. Ajouter un film</h3>
              </button>
            </div>
          ),
        )}
      </div>
      {picking ? <PickFilm title={`Ton n° ${picking}`} onPick={choose} onClose={() => setPicking(null)} /> : null}
    </section>
  );
}

function Portrait() {
  const { profile, seen, rated, watchlist, titles } = useProfile();
  const ratings = useMemo(() => [...rated.values()], [rated]);
  const avg = ratings.length ? ratings.reduce((s, x) => s + x, 0) / ratings.length : 0;
  const fives = useMemo(() => [...rated.entries()].filter(([, r]) => r >= 5).map(([id]) => id), [rated]);
  const favs = useAsync(
    async () => {
      const ids = fives.slice(0, 12);
      const det = await Promise.all(ids.map((id) => tmdb<{ id: number; title: string; release_date?: string }>(`movie/${id}`).catch(() => null)));
      return det.filter(Boolean) as { id: number; title: string; release_date?: string }[];
    },
    [fives.join(",")],
    fives.length > 0,
  );

  return (
    <>
      <section className="section">
        <SecHead as="h1" title="Mon profil" />
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
            <span className="lbl">Coups de cœur (5★)</span>
            <b>{fives.length}</b>
          </div>
          <div>
            <span className="lbl">En watchlist</span>
            <b>{watchlist.size.toLocaleString("fr-FR")}</b>
          </div>
        </div>
        <p className="note" style={{ marginTop: 16 }}>
          <Link className="link" href="/journal?onglet=vus">
            Tous tes films vus
          </Link>
          {" · "}
          <Link className="link" href="/journal">
            Ton journal
          </Link>
          {" · "}
          <Link className="link" href="/collection">
            Ta cinémathèque
          </Link>
          {" · "}
          <Link className="link" href={profileHref(profile!.id, profile!.username)}>
            Ton profil public
          </Link>
        </p>
      </section>

      <TopFive />

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

      {fives.length ? (
        <section className="section">
          <SecHead title="Tes 5 étoiles" aside={fives.length > 12 ? `12 sur ${fives.length}` : undefined} />
          <p className="tally">
            {(favs.data ?? fives.slice(0, 12).map((id) => ({ id, title: titles[id] || "…", release_date: "" }))).map((m, i, arr) => (
              <span key={m.id}>
                <Link href={`/film/${m.id}`}>{m.title}</Link>
                {m.release_date ? ` (${m.release_date.slice(0, 4)})` : ""}
                {i < arr.length - 1 ? ", " : "."}
              </span>
            ))}
          </p>
        </section>
      ) : null}
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
