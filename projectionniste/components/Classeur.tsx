"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { directorFilmIds, directorFilms, formatCode, groupByDirector, type DirectorGroup, type Entry } from "@/lib/collection";
import { useAsync } from "@/lib/hooks";
import { img } from "@/lib/tmdb";
import type { Movie } from "@/lib/types";
import { Plus } from "./icons";
import { ErrorLine, Loader, duo } from "./ui";

const year = (d?: string | null) => (d || "").slice(0, 4);

/** Pour chaque réalisateur : ses films connus. Chargés petit à petit, gardés une semaine dans le navigateur. */
function useFilmographies(groups: DirectorGroup[]) {
  const [ids, setIds] = useState<Map<number, number[]>>(new Map());
  const wanted = useMemo(() => groups.map((g) => g.id).filter((x): x is number => !!x), [groups]);
  useEffect(() => {
    let alive = true;
    for (const id of wanted) {
      directorFilmIds(id).then(
        (list) => alive && setIds((m) => (m.has(id) ? m : new Map(m).set(id, list))),
        () => {},
      );
    }
    return () => {
      alive = false;
    };
  }, [wanted]);
  return ids;
}

type Sort = "az" | "films" | "presque";

/** Index : un réalisateur par ligne, avec ce que tu as et ce qu'il te manque. */
function Index({ entries, onOpen }: { entries: Entry[]; onOpen: (id: number) => void }) {
  const [sort, setSort] = useState<Sort>("az");
  const [q, setQ] = useState("");
  const groups = useMemo(() => groupByDirector(entries), [entries]);
  const known = groups.filter((g) => g.name);
  const unknown = groups.find((g) => !g.name);
  const owned = useMemo(() => new Set(entries.map((e) => e.tmdb_id)), [entries]);
  const films = useFilmographies(known);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const l = known
      .filter((g) => !needle || g.name.toLowerCase().includes(needle))
      .map((g) => {
        const all = g.id ? films.get(g.id) : undefined;
        const missing = all ? all.filter((id) => !owned.has(id)).length : null;
        return { g, missing, total: missing == null ? null : g.entries.length + missing };
      });
    if (sort === "films") l.sort((a, b) => b.g.entries.length - a.g.entries.length);
    if (sort === "presque") l.sort((a, b) => (a.missing ?? 1e9) - (b.missing ?? 1e9) || b.g.entries.length - a.g.entries.length);
    return l;
  }, [known, films, owned, q, sort]);

  return (
    <div>
      <div className="filterbar">
        <input className="input search-in" type="search" placeholder="Chercher un réalisateur" aria-label="Chercher un réalisateur" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="radiogroup" aria-label="Tri des réalisateurs">
          <button type="button" role="radio" aria-checked={sort === "az"} onClick={() => setSort("az")}>
            A–Z
          </button>
          <button type="button" role="radio" aria-checked={sort === "films"} onClick={() => setSort("films")}>
            Plus de films
          </button>
          <button type="button" role="radio" aria-checked={sort === "presque"} onClick={() => setSort("presque")}>
            Presque complets
          </button>
        </div>
        <span className="count">
          {known.length} réalisateur{known.length > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="dirs">
        {rows.map(({ g, missing, total }) => (
          <li key={g.id ?? g.name}>
            <button type="button" className="dir-row" onClick={() => g.id && onOpen(g.id)} disabled={!g.id} aria-label={`${g.name} : ${g.entries.length} films possédés`}>
              <span className="dir-name">{duo(g.name)}</span>
              <span className="dir-count">
                <b>{g.entries.length}</b> possédé{g.entries.length > 1 ? "s" : ""}
                {total != null ? <> sur {total}</> : null}
              </span>
              <span className={`dir-missing${missing === 0 ? " done" : ""}`}>{missing == null ? "…" : missing === 0 ? "Complet" : `Il en manque ${missing}`}</span>
              <span className="dir-bar" aria-hidden="true">
                <i style={{ width: total ? `${Math.round((g.entries.length / total) * 100)}%` : "0%" }} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!rows.length ? <p className="status">Aucun réalisateur ne correspond.</p> : null}
      {unknown ? (
        <p className="note" style={{ marginTop: 24 }}>
          {unknown.entries.length} film{unknown.entries.length > 1 ? "s" : ""} sans réalisateur connu pour l'instant (complétés automatiquement quand TMDB répond).
        </p>
      ) : null}
    </div>
  );
}

/** Détail d'un réalisateur : ce que tu possèdes et tout ce qu'il te manque. */
function Detail({ group, entries, wants, onWant, onBack }: { group: DirectorGroup; entries: Entry[]; wants: Set<number>; onWant: (m: Movie) => void; onBack: () => void }) {
  const films = useAsync(() => directorFilms(group.id!), [group.id]);
  const owned = useMemo(() => new Set(entries.map((e) => e.tmdb_id)), [entries]);
  const list = films.data ?? [];
  const missing = list.filter((m) => !owned.has(m.id));
  const total = group.entries.length + missing.length;
  const pct = total ? Math.round((group.entries.length / total) * 100) : 0;
  const nWants = missing.filter((m) => wants.has(m.id)).length;

  return (
    <section className="dir-detail" aria-label={`Films de ${group.name}`}>
      <button type="button" className="link-quiet back" onClick={onBack}>
        ← Tous les réalisateurs
      </button>
      <div className="series-head">
        <div>
          <div className="label">Réalisateur</div>
          <h2>
            <Link href={`/personne/${group.id}`}>{duo(group.name)}</Link>
          </h2>
        </div>
      </div>
      {films.error ? (
        <ErrorLine error={films.error} onRetry={films.reload} />
      ) : !films.data ? (
        <Loader text="Chargement de sa filmographie…" />
      ) : (
        <>
          <div className="sprogress" role="img" aria-label={`${group.entries.length} films sur ${total}`}>
            <div className="bar">
              <i style={{ width: `${pct}%` }} />
            </div>
            <b>
              {group.entries.length} / {total}
            </b>
          </div>

          <h3 className="dir-h">
            Tu possèdes <span>{group.entries.length}</span>
          </h3>
          <div className="pockets">
            {group.entries.map((e) => (
              <Link key={e.tmdb_id} href={`/film/${e.tmdb_id}`} className={`pocket own f-${e.finish}`} title={`${e.film.title} (${year(e.film.release_date)})`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.film.poster_path ? <img src={img(e.film.poster_path, "w185")} alt={e.film.title} loading="lazy" /> : null}
                <span className="m">{formatCode(e.best.format)}</span>
              </Link>
            ))}
          </div>

          {missing.length ? (
            <>
              <h3 className="dir-h">
                Il te manque <span>{missing.length}</span>
                {nWants ? <em>{nWants} dans tes envies</em> : null}
              </h3>
              <div className="miss-grid">
                {missing.map((m) => (
                  <div key={m.id} className="miss">
                    <Link href={`/film/${m.id}`} className="miss-poster" title={m.title}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img(m.poster_path!, "w185")} alt={m.title} loading="lazy" />
                    </Link>
                    <Link href={`/film/${m.id}`} className="miss-title">
                      {m.title}
                    </Link>
                    <span className="miss-year">{year(m.release_date)}</span>
                    <button type="button" className="btn ghost small" aria-pressed={wants.has(m.id)} onClick={() => onWant(m)}>
                      {wants.has(m.id) ? (
                        "Dans mes envies"
                      ) : (
                        <>
                          <Plus />
                          Envie
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="status">Filmographie complète : tu as tout.</p>
          )}
        </>
      )}
    </section>
  );
}

/** Vue Classeur : un réalisateur par ligne ; un clic montre tout ce qu'il te manque. */
export function Classeur({
  entries,
  wants,
  onWant,
  openId,
  onOpen,
}: {
  entries: Entry[];
  wants: Set<number>;
  onWant: (m: Movie) => void;
  openId: number | null;
  onOpen: (id: number | null) => void;
}) {
  const groups = useMemo(() => groupByDirector(entries), [entries]);
  const open = openId ? groups.find((g) => g.id === openId) : null;
  if (!entries.length)
    return (
      <div className="empty">
        <p>Aucun film dans ta cinémathèque.</p>
      </div>
    );
  if (open) return <Detail group={open} entries={entries} wants={wants} onWant={onWant} onBack={() => onOpen(null)} />;
  return <Index entries={entries} onOpen={onOpen} />;
}
