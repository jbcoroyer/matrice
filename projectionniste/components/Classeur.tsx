"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addSeries, formatCode, removeSeries, seriesFilms, type Entry, type Series } from "@/lib/collection";
import { useAsync } from "@/lib/hooks";
import { img, tmdb } from "@/lib/tmdb";
import type { Movie, Paged, Person } from "@/lib/types";
import { Plus } from "./icons";
import { useProfile } from "./ProfileProvider";
import { ErrorLine, Loader } from "./ui";

const PAGE = 9;

/** Une série : les poches du classeur, remplies par tes exemplaires, vides pour ce qu'il manque. */
function SeriesBinder({
  series,
  entries,
  wants,
  onWant,
  onRemove,
  onDone,
}: {
  series: Series;
  entries: Map<number, Entry>;
  wants: Set<number>;
  onWant: (m: Movie) => void;
  onRemove: () => void;
  onDone: (id: string, complete: boolean) => void;
}) {
  const films = useAsync(() => seriesFilms(series.kind, series.ref_id), [series.kind, series.ref_id]);
  const [page, setPage] = useState(0);
  const [all, setAll] = useState(false);
  const list = films.data ?? [];
  const have = list.filter((m) => entries.has(m.id));
  const missing = list.filter((m) => !entries.has(m.id));
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const shown = list.slice(page * PAGE, page * PAGE + PAGE);
  const pct = list.length ? Math.round((have.length / list.length) * 100) : 0;

  useEffect(() => {
    if (films.data) onDone(series.id, films.data.length > 0 && missing.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [films.data, missing.length]);

  const [first, ...rest] = series.name.split(" ");
  return (
    <section className="series" aria-label={`Série ${series.name}`}>
      <div className="series-head">
        <div>
          <div className="label">{series.kind === "person" ? "Cinéaste" : "Saga"}</div>
          <h2>
            {rest.length ? (
              <>
                {first} <span>{rest.join(" ")}</span>
              </>
            ) : (
              series.name
            )}
          </h2>
        </div>
        <span className="aside">
          <button type="button" className="link-btn quiet" onClick={onRemove}>
            Retirer cette série
          </button>
        </span>
      </div>
      {films.error ? (
        <ErrorLine error={films.error} onRetry={films.reload} />
      ) : !films.data ? (
        <Loader text="Chargement de la série…" />
      ) : !list.length ? (
        <p className="status">Aucun film à afficher pour cette série.</p>
      ) : (
        <div className="binder-wrap">
          <div>
            <div className="binder">
              {shown.map((m) => {
                const e = entries.get(m.id);
                return e ? (
                  <Link key={m.id} href={`/film/${m.id}`} className={`pocket own f-${e.finish}`} title={`${m.title} (${(m.release_date || "").slice(0, 4)})`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img(m.poster_path!, "w185")} alt={m.title} loading="lazy" />
                    <span className="m">{formatCode(e.best.format)}</span>
                  </Link>
                ) : (
                  <Link key={m.id} href={`/film/${m.id}`} className={`pocket miss${wants.has(m.id) ? " want" : ""}`} title={wants.has(m.id) ? "Dans tes envies" : "Il te manque ce film"}>
                    <div>
                      <b>{m.title}</b>
                      <span>{(m.release_date || "").slice(0, 4)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {pages > 1 ? (
              <div className="binder-nav">
                <button type="button" className="btn ghost small" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Page précédente">
                  ←
                </button>
                <span>
                  Page {page + 1} / {pages}
                </span>
                <button type="button" className="btn ghost small" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Page suivante">
                  →
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <div className="sprogress" role="img" aria-label={`${have.length} films sur ${list.length}`}>
              <div className="bar">
                <i style={{ width: `${pct}%` }} />
              </div>
              <b>
                {have.length} / {list.length}
              </b>
            </div>
            {missing.length ? (
              <>
                <div className="label" style={{ marginBottom: 6 }}>
                  Il te manque
                </div>
                <ul className="wants">
                  {(all ? missing : missing.slice(0, 6)).map((m) => (
                    <li key={m.id}>
                      <Link href={`/film/${m.id}`}>{m.title}</Link>
                      <span className="y">{(m.release_date || "").slice(0, 4)}</span>
                      <button type="button" className="btn ghost" aria-pressed={wants.has(m.id)} onClick={() => onWant(m)}>
                        {wants.has(m.id) ? "Dans mes envies" : (
                          <>
                            <Plus />
                            Envie
                          </>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                {missing.length > 6 ? (
                  <button type="button" className="link-btn quiet" style={{ marginTop: 12 }} onClick={() => setAll(!all)}>
                    {all ? "Réduire" : `Voir les ${missing.length - 6} autres`}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="status">Série complète.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Cherche un cinéaste et en fait une série. */
function AddSeries({ onAdd }: { onAdd: (s: Omit<Series, "id">) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Person[] | null>(null);
  const [busy, setBusy] = useState(false);
  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await tmdb<Paged<Person>>("search/person", { query: q.trim() });
      setRes(r.results.filter((p) => p.known_for_department === "Directing").slice(0, 6).concat(r.results.filter((p) => p.known_for_department !== "Directing")).slice(0, 6));
    } catch {
      setRes([]);
    }
    setBusy(false);
  };
  return (
    <div className="add-series">
      <form onSubmit={search} className="share-link">
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom d'un cinéaste : Kubrick, Varda, Miyazaki…" aria-label="Chercher un cinéaste" />
        <button type="submit" className="btn" disabled={busy || !q.trim()}>
          Chercher
        </button>
      </form>
      {res ? (
        res.length ? (
          <div className="suggest-series">
            {res.map((p) => (
              <button key={p.id} type="button" className="chip" onClick={() => (onAdd({ kind: "person", ref_id: p.id, name: p.name }), setRes(null), setQ(""))}>
                <Plus />
                {p.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="status">Personne trouvé.</p>
        )
      ) : null}
    </div>
  );
}

/** Vue Classeur : séries à compléter, avec ce qu'il manque et un bouton « Envie ». */
export function Classeur({
  series,
  entries,
  wants,
  onWant,
  onSeriesChange,
  onComplete,
}: {
  series: Series[];
  entries: Entry[];
  wants: Set<number>;
  onWant: (m: Movie) => void;
  onSeriesChange: () => void;
  onComplete: (id: string, complete: boolean) => void;
}) {
  const { sb, userId, toast } = useProfile();
  const byId = useMemo(() => new Map(entries.map((e) => [e.tmdb_id, e])), [entries]);
  const [adding, setAdding] = useState(false);

  // suggestions : cinéastes et sagas dont tu possèdes au moins deux films
  const suggestions = useMemo(() => {
    const have = new Set(series.map((s) => `${s.kind}:${s.ref_id}`));
    const by = new Map<string, { s: Omit<Series, "id">; films: Set<number> }>();
    for (const e of entries) {
      for (const c of e.copies) {
        const cands: Omit<Series, "id">[] = [];
        if (c.director_id && c.director) cands.push({ kind: "person", ref_id: c.director_id, name: c.director });
        if (c.saga_id && c.saga_name) cands.push({ kind: "saga", ref_id: c.saga_id, name: c.saga_name });
        for (const s of cands) {
          const k = `${s.kind}:${s.ref_id}`;
          if (have.has(k)) continue;
          const g = by.get(k) ?? { s, films: new Set<number>() };
          g.films.add(e.tmdb_id);
          by.set(k, g);
        }
      }
    }
    return [...by.values()].filter((g) => g.films.size >= 2).sort((a, b) => b.films.size - a.films.size).slice(0, 8);
  }, [entries, series]);

  const add = async (s: Omit<Series, "id">) => {
    if (!sb || !userId) return;
    try {
      await addSeries(sb, userId, s);
      onSeriesChange();
    } catch (e) {
      toast(`Échec : ${(e as Error).message}`);
    }
  };
  const remove = async (s: Series) => {
    if (!sb) return;
    try {
      await removeSeries(sb, s.id);
      onSeriesChange();
      toast(`Série « ${s.name} » retirée`);
    } catch (e) {
      toast(`Échec : ${(e as Error).message}`);
    }
  };

  return (
    <div>
      {suggestions.length ? (
        <div className="suggest-series">
          <span>Séries possibles :</span>
          {suggestions.map((g) => (
            <button key={`${g.s.kind}${g.s.ref_id}`} type="button" className="chip" onClick={() => add(g.s)} title={`${g.films.size} films possédés`}>
              <Plus />
              {g.s.name} <i style={{ fontStyle: "normal", opacity: 0.6 }}>{g.films.size}</i>
            </button>
          ))}
        </div>
      ) : null}
      {series.map((s) => (
        <SeriesBinder key={s.id} series={s} entries={byId} wants={wants} onWant={onWant} onRemove={() => remove(s)} onDone={onComplete} />
      ))}
      {!series.length && !suggestions.length ? (
        <div className="empty">
          <p>Aucune série pour l'instant.</p>
          <p className="note">Une série, c'est la filmographie d'un cinéaste ou une saga : le classeur montre ce que tu possèdes et ce qu'il te manque.</p>
        </div>
      ) : null}
      <div style={{ marginTop: 8 }}>
        {adding ? (
          <AddSeries onAdd={(s) => (add(s), setAdding(false))} />
        ) : (
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            <Plus />
            Ajouter une série
          </button>
        )}
      </div>
    </div>
  );
}
