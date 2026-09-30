"use client";

import { errorText } from "@/lib/errors";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PickFilm } from "@/components/PickFilm";
import { Plus } from "@/components/icons";
import { useProfile, type FilmInput } from "@/components/ProfileProvider";
import { EmptyState, ProfileGate, SecHead, StartActions } from "@/components/ui";
import { genreFrFromName } from "@/lib/genres";
import { num1 } from "@/lib/format";
import { tmdb } from "@/lib/tmdb";
import { useAsync } from "@/lib/hooks";
import { filmRow } from "@/lib/db";
import { clearTopSlot, loadTop, setTopSlot, type TopFilm } from "@/lib/diary";
import { Poster } from "@/components/Poster";
import type { Paged, Person } from "@/lib/types";

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

/** Retrouve la fiche TMDB d'un nom (pour le lien), seulement au clic. */
function PersonLink({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <a
      href={`/recherche?q=${encodeURIComponent(name)}`}
      onClick={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        const r = await tmdb<Paged<Person>>("search/person", { query: name }).catch(() => null);
        const hit = r?.results?.find((p) => p.name === name) || r?.results?.[0];
        location.href = hit ? `/personne/${hit.id}` : `/recherche?q=${encodeURIComponent(name)}`;
      }}
      title={name}
    >
      {name}
    </a>
  );
}

function AffList({ entries, people }: { entries: [string, number][]; people: boolean }) {
  const max = Math.max(0.01, ...entries.map(([, a]) => Math.abs(a)));
  return (
    <ul className="aff-list">
      {entries.map(([n, a]) => (
        <li key={n}>
          {people ? <PersonLink name={n} /> : <span>{genreFrFromName(n)}</span>}
          <span className="aff-bar" aria-hidden="true">
            <i className={a < 0 ? "neg" : undefined} style={a < 0 ? { right: "50%", width: `${(Math.abs(a) / max) * 50}%` } : { left: "50%", width: `${(a / max) * 50}%` }} />
          </span>
          <span className="n">{(a >= 0 ? "+" : "−") + Math.abs(a).toFixed(2).replace(".", ",")}</span>
        </li>
      ))}
    </ul>
  );
}

function top(o: Record<string, number>, n: number, dir: 1 | -1) {
  return Object.entries(o)
    .filter(([, a]) => a * dir > 0)
    .sort((a, b) => (b[1] - a[1]) * dir)
    .slice(0, n);
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
  const aff = profile!.aff;
  const noAff = !Object.keys(aff.d).length && !Object.keys(aff.c).length && !Object.keys(aff.g).length;
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
        <SecHead as="h1" title="Mon profil" aside={profile!.importedAt ? `Goûts appris lors de l'import Letterboxd du ${new Date(profile!.importedAt).toLocaleDateString("fr-FR")}` : "Importe ton Letterboxd pour affiner les affinités"} />
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
        <SecHead title="Ce que tu aimes" aside="Écart à ta note moyenne, lissé" />
        {noAff ? (
          <EmptyState title="Tes goûts apparaîtront ici" actions={<StartActions />}>
            Note quelques films, ou importe ton Letterboxd : Filmable en déduit les réalisateurs, interprètes et genres qui te réussissent, et s'en sert pour ton indice.
          </EmptyState>
        ) : null}
        {noAff ? null : <div className="aff-cols">
          <div>
            <h3 className="lbl">Réalisateurs qui te réussissent</h3>
            <AffList entries={top(aff.d, 12, 1)} people />
          </div>
          <div>
            <h3 className="lbl">Interprètes fétiches</h3>
            <AffList entries={top(aff.c, 12, 1)} people />
          </div>
          <div>
            <h3 className="lbl">Genres</h3>
            <AffList entries={Object.entries(aff.g).sort((a, b) => b[1] - a[1])} people={false} />
          </div>
          <div>
            <h3 className="lbl">Cinéastes qui te laissent froid</h3>
            <AffList entries={top(aff.d, 8, -1)} people />
          </div>
        </div>}
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
